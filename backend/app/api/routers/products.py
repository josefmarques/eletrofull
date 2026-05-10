from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime
from decimal import Decimal

from app.core.database import get_session
from app.models.products import Product
from app.models.categories import Category
from app.models.stocks import Stock
from app.models.branches import Branch
from app.models.enums import UnitType
from app.api.dependencies import get_current_user
from app.models.users import User
from app.core.audit import log_audit
from app.models.audit import AuditAction

router = APIRouter(tags=["products"])


# ─── Schemas ─────────────────────────────────────────────────────────────────


class ProductCreate(BaseModel):
    name: str
    categoryId: UUID
    unitPrice: int  # em centavos
    unitType: UnitType = UnitType.UN
    quantity: Optional[int] = 0
    minimumQuantity: Optional[int] = 0
    maximumQuantity: Optional[int] = 0


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    categoryId: Optional[UUID] = None
    unitPrice: Optional[int] = None
    unitType: Optional[UnitType] = None
    quantity: Optional[int] = None
    minimumQuantity: Optional[int] = None
    maximumQuantity: Optional[int] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _build_product_response(
    product: Product,
    category_name: Optional[str] = None,
    stock_data: Optional[dict] = None,
) -> dict:
    """Monta o dicionário de resposta no formato que o frontend espera."""
    return {
        "id": str(product.id),
        "name": product.name,
        "categoryId": str(product.category_id),
        "categoryName": category_name or "",
        "unitPrice": product.unit_price,
        "unitType": product.unit_type.value if hasattr(product.unit_type, "value") else str(product.unit_type),
        "quantity": str(stock_data["quantity"]) if stock_data and stock_data.get("quantity") is not None else "0",
        "minimumQuantity": str(stock_data["minimum_quantity"]) if stock_data and stock_data.get("minimum_quantity") is not None else "0",
        "maximumQuantity": str(stock_data["maximum_quantity"]) if stock_data and stock_data.get("maximum_quantity") is not None else "0",
        "createdAt": product.created_at.isoformat() if product.created_at else None,
        "updatedAt": product.updated_at.isoformat() if product.updated_at else None,
    }


def _get_stock_data(
    session: Session,
    product_id: UUID,
    branch_id: Optional[UUID] = None,
) -> dict:
    """
    Retorna dados de estoque de um produto.

    - Se branch_id for informado: retorna a quantidade EXATA daquela filial.
    - Se branch_id for None ('Rede Completa'): retorna a SOMA de todas as filiais.
    """
    if branch_id:
        # Estoque específico de uma filial
        stock = session.exec(
            select(Stock).where(
                Stock.product_id == product_id,
                Stock.branch_id == branch_id,
            )
        ).first()
        return {
            "quantity": stock.quantity if stock else Decimal("0"),
            "minimum_quantity": stock.minimum_quantity if stock else Decimal("0"),
            "maximum_quantity": stock.maximum_quantity if stock else Decimal("0"),
        }
    else:
        # Rede Completa: soma o estoque de TODAS as filiais
        # select(func.sum(...)) retorna um valor ESCALAR (Decimal), não um Row
        stmt = select(func.sum(Stock.quantity)).where(
            Stock.product_id == product_id,
        )
        result = session.exec(stmt).first()
        total_qty = result if result is not None else Decimal("0")
        return {
            "quantity": total_qty,
            "minimum_quantity": Decimal("0"),  # Não faz sentido agregar mínimo/máximo entre filiais
            "maximum_quantity": Decimal("0"),
        }


# ─── Endpoints ───────────────────────────────────────────────────────────────


@router.get("/products")
def list_products(
    name: Optional[str] = Query(None),
    branchId: Optional[UUID] = Query(None, alias="branchId"),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Lista produtos com filtro opcional por nome e branchId, incluindo JOIN com categorias e estoque."""
    # Monta a query base com JOIN em categorias
    query = (
        select(Product, Category.name)
        .join(Category, Product.category_id == Category.id)
        .where(Product.deleted_at.is_(None))
    )

    if name:
        query = query.where(Product.name.ilike(f"%{name}%"))

    query = query.order_by(Product.name).offset(offset).limit(limit)

    rows = session.exec(query).all()

    result = []
    for product, category_name in rows:
        stock_data = _get_stock_data(session, product.id, branchId)
        result.append(_build_product_response(product, category_name, stock_data))

    return {"error": None, "data": result}


@router.get("/products/{product_id}")
def get_product(
    product_id: UUID,
    branchId: Optional[UUID] = Query(None, alias="branchId"),
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Retorna um produto pelo ID com nome da categoria e dados de estoque."""
    product = session.get(Product, product_id)
    if not product or product.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado",
        )

    # Busca o nome da categoria
    category = session.get(Category, product.category_id)
    category_name = category.name if category else None

    # Busca dados de estoque (agregado ou por filial)
    stock_data = _get_stock_data(session, product_id, branchId)

    return {
        "error": None,
        "data": _build_product_response(product, category_name, stock_data),
    }


@router.post("/products", status_code=status.HTTP_201_CREATED)
def create_product(
    body: ProductCreate,
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Cria um novo produto e seu registro de estoque inicial."""
    # Verifica se a categoria existe
    category = session.get(Category, body.categoryId)
    if not category or category.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada",
        )

    # Verifica duplicidade de nome
    existing = session.exec(
        select(Product).where(
            Product.name == body.name,
            Product.deleted_at.is_(None),
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um produto com este nome",
        )

    # Cria o produto
    product = Product(
        name=body.name,
        category_id=body.categoryId,
        unit_price=body.unitPrice,
        unit_type=body.unitType,
    )
    session.add(product)
    session.flush()  # Para obter o ID do produto

    # Determina a branch para criar o estoque inicial
    branch_id = _current_user.branch_id
    if not branch_id:
        # Se o usuário não tem branch, pega a primeira filial disponível
        first_branch = session.exec(select(Branch).where(Branch.deleted_at.is_(None)).limit(1)).first()
        if first_branch:
            branch_id = first_branch.id

    # Cria o registro de estoque inicial (se houver uma branch)
    created_stock = None
    if branch_id:
        created_stock = Stock(
            branch_id=branch_id,
            product_id=product.id,
            quantity=str(body.quantity) if body.quantity else "0",
            minimum_quantity=str(body.minimumQuantity) if body.minimumQuantity else "0",
            maximum_quantity=str(body.maximumQuantity) if body.maximumQuantity else "0",
        )
        session.add(created_stock)
    session.commit()
    session.refresh(product)

    stock_data = {
        "quantity": created_stock.quantity if created_stock else Decimal("0"),
        "minimum_quantity": created_stock.minimum_quantity if created_stock else Decimal("0"),
        "maximum_quantity": created_stock.maximum_quantity if created_stock else Decimal("0"),
    }

    return {
        "error": None,
        "data": _build_product_response(product, category.name, stock_data),
    }


@router.put("/products/{product_id}")
def update_product(
    product_id: UUID,
    body: ProductUpdate,
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Atualiza os dados de um produto."""
    product = session.get(Product, product_id)
    if not product or product.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado",
        )

    # ── Captura ESTADO ANTES da mudança (old_values) ──
    old_values = {
        "name": product.name,
        "category_id": str(product.category_id),
        "unit_price": product.unit_price,
        "unit_type": product.unit_type.value if hasattr(product.unit_type, "value") else str(product.unit_type),
    }

    if body.name is not None:
        existing = session.exec(
            select(Product).where(
                Product.name == body.name,
                Product.id != product_id,
                Product.deleted_at.is_(None),
            )
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe outro produto com este nome",
            )
        product.name = body.name

    if body.categoryId is not None:
        category = session.get(Category, body.categoryId)
        if not category or category.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria não encontrada",
            )
        product.category_id = body.categoryId

    if body.unitPrice is not None:
        product.unit_price = body.unitPrice

    if body.unitType is not None:
        product.unit_type = body.unitType

    product.updated_at = datetime.now()
    session.add(product)
    session.flush()

    # ── Atualiza o estoque se os campos de quantidade forem enviados ──
    branch_id = _current_user.branch_id
    if not branch_id:
        first_branch = session.exec(
            select(Branch).where(Branch.deleted_at.is_(None)).limit(1)
        ).first()
        if first_branch:
            branch_id = first_branch.id

    if branch_id and any(
        x is not None
        for x in [body.quantity, body.minimumQuantity, body.maximumQuantity]
    ):
        stock = session.exec(
            select(Stock).where(
                Stock.product_id == product_id,
                Stock.branch_id == branch_id,
            )
        ).first()

        if stock:
            if body.quantity is not None:
                stock.quantity = str(body.quantity)
            if body.minimumQuantity is not None:
                stock.minimum_quantity = str(body.minimumQuantity)
            if body.maximumQuantity is not None:
                stock.maximum_quantity = str(body.maximumQuantity)
            session.add(stock)

    # ── Captura ESTADO DEPOIS da mudança (new_values) ──
    new_values = {
        "name": product.name,
        "category_id": str(product.category_id),
        "unit_price": product.unit_price,
        "unit_type": product.unit_type.value if hasattr(product.unit_type, "value") else str(product.unit_type),
    }

    # ── Registra auditoria ──
    log_audit(
        session=session,
        user_id=_current_user.id,
        action=AuditAction.UPDATE,
        entity_name="Product",
        entity_id=str(product.id),
        old_values=old_values,
        new_values=new_values,
    )

    session.commit()
    session.refresh(product)

    # Busca dados para resposta
    category = session.get(Category, product.category_id)
    stock_data = _get_stock_data(session, product_id, branch_id)

    return {
        "error": None,
        "data": _build_product_response(product, category.name if category else None, stock_data),
    }


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: UUID,
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Soft delete de um produto (marca deleted_at)."""
    product = session.get(Product, product_id)
    if not product or product.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado",
        )

    product.deleted_at = datetime.now()
    session.add(product)
    session.commit()

    return None  # 204 No Content
