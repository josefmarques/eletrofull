from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from pydantic import BaseModel, Field as PydanticField
from uuid import UUID
from typing import Optional, List
from datetime import datetime, timedelta
from decimal import Decimal

from app.core.database import get_session
from app.models.quotes import Quote, QuoteItem
from app.models.products import Product
from app.models.stocks import Stock
from app.models.sales import Sale
from app.models.sale_items import SaleItem
from app.models.moves import Move
from app.models.enums import MoveType, PaymentMethod
from app.models.payments import Payment
from app.models.customers import Customer
from app.models.users import User
from app.models.audit import AuditAction
from app.core.audit import log_audit
from app.api.dependencies import get_current_user
from app.core.timezone import br_now_naive

router = APIRouter(tags=["quotes"])


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _build_quote_response(quote: Quote, session: Session) -> dict:
    """Monta a resposta JSON de um orçamento com items, nomes de produtos."""
    # Busca os itens
    items_db = session.exec(
        select(QuoteItem).where(QuoteItem.quote_id == quote.id)
    ).all()

    items_data = []
    for item in items_db:
        # Se não tiver product_name denormalizado, busca do produto
        product_name = item.product_name
        if not product_name:
            product = session.get(Product, item.product_id)
            product_name = product.name if product else "Produto removido"

        items_data.append({
            "id": str(item.id),
            "productId": str(item.product_id),
            "productName": product_name,
            "quantity": item.quantity,
            "unitPrice": str(item.unit_price),
            "subtotal": str(item.subtotal),
        })

    # Nomes do usuário, vendedor e cliente
    user_name = None
    seller_name = None
    customer_name = None

    user = session.get(User, quote.user_id)
    if user:
        user_name = user.name

    if quote.seller_id:
        seller = session.get(User, quote.seller_id)
        if seller:
            seller_name = seller.name

    if quote.customer_id:
        customer = session.get(Customer, quote.customer_id)
        if customer:
            customer_name = customer.name

    return {
        "id": str(quote.id),
        "branchId": str(quote.branch_id),
        "userId": str(quote.user_id),
        "userName": user_name,
        "sellerId": str(quote.seller_id) if quote.seller_id else None,
        "sellerName": seller_name,
        "customerId": str(quote.customer_id) if quote.customer_id else None,
        "customerName": customer_name,
        "grossValue": str(quote.gross_value),
        "discount": str(quote.discount),
        "totalValue": str(quote.total_value),
        "status": quote.status,
        "expiresAt": quote.expires_at.isoformat() if quote.expires_at else None,
        "observations": quote.observations,
        "createdAt": quote.created_at.isoformat() if quote.created_at else None,
        "updatedAt": quote.updated_at.isoformat() if quote.updated_at else None,
        "items": items_data,
    }


def _calculate_commission(total_value: Decimal, seller: User) -> Decimal:
    """Calcula comissão do vendedor."""
    if seller.commission_rate > 0:
        return total_value * Decimal(str(seller.commission_rate)) / Decimal("100")
    return Decimal("0")


# ─── Schemas ─────────────────────────────────────────────────────────────────


class QuoteItemPayload(BaseModel):
    productId: UUID
    quantity: int
    unitPrice: str | int | float
    subtotal: str | int | float
    name: Optional[str] = None


class QuoteCreate(BaseModel):
    branchId: UUID
    customerId: Optional[UUID] = None
    sellerId: Optional[UUID] = None
    grossValue: str | int | float
    totalValue: str | int | float
    discount: str | int | float = "0.00"
    observations: Optional[str] = None
    items: List[QuoteItemPayload]


class QuoteUpdate(BaseModel):
    """Atualização parcial de orçamento."""
    customerId: Optional[UUID] = None
    sellerId: Optional[UUID] = None
    grossValue: Optional[str | int | float] = None
    totalValue: Optional[str | int | float] = None
    discount: Optional[str | int | float] = None
    observations: Optional[str] = None
    status: Optional[str] = None
    items: Optional[List[QuoteItemPayload]] = None


# ─── Endpoints ───────────────────────────────────────────────────────────────


@router.get("/quotes")
def list_quotes(
    branchId: Optional[UUID] = Query(None, alias="branchId"),
    sellerId: Optional[UUID] = Query(None, alias="sellerId"),
    status: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Lista orçamentos com filtros opcionais."""
    query = select(Quote).order_by(Quote.created_at.desc())

    if branchId:
        query = query.where(Quote.branch_id == branchId)
    if sellerId:
        query = query.where(Quote.seller_id == sellerId)
    if status:
        query = query.where(Quote.status == status)

    query = query.offset(offset).limit(limit)
    quotes = session.exec(query).all()

    return {
        "error": None,
        "data": [_build_quote_response(q, session) for q in quotes],
    }


@router.get("/quotes/{quote_id}")
def get_quote(
    quote_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Retorna um orçamento pelo ID com seus itens."""
    quote = session.get(Quote, quote_id)
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orçamento não encontrado",
        )

    return {
        "error": None,
        "data": _build_quote_response(quote, session),
    }


@router.post("/quotes", status_code=status.HTTP_201_CREATED)
def create_quote(
    body: QuoteCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cria um novo orçamento (sem baixar estoque, sem financeiro)."""
    if not body.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O orçamento deve conter ao menos um item",
        )

    # Verifica se a filial existe
    from app.models.branches import Branch
    branch = session.get(Branch, body.branchId)
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Filial não encontrada",
        )

    # Verifica se os produtos existem
    for item_payload in body.items:
        product = session.get(Product, item_payload.productId)
        if not product or product.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto {item_payload.productId} não encontrado",
            )

    # Valores
    total_value = Decimal(str(body.totalValue))
    gross_value = Decimal(str(body.grossValue))
    discount = Decimal(str(body.discount))

    # Data de expiração: 5 dias
    expires_at = br_now_naive() + timedelta(days=5)

    # Cria o orçamento
    quote = Quote(
        branch_id=body.branchId,
        user_id=current_user.id,
        customer_id=body.customerId,
        seller_id=body.sellerId,
        gross_value=gross_value,
        discount=discount,
        total_value=total_value,
        status="pendente",
        expires_at=expires_at,
        observations=body.observations,
    )
    session.add(quote)
    session.flush()

    # Cria os itens
    for item_payload in body.items:
        product = session.get(Product, item_payload.productId)

        quote_item = QuoteItem(
            quote_id=quote.id,
            product_id=item_payload.productId,
            product_name=product.name if product else item_payload.name,
            quantity=item_payload.quantity,
            unit_price=Decimal(str(item_payload.unitPrice)),
            subtotal=Decimal(str(item_payload.subtotal)),
        )
        session.add(quote_item)

    # Auditoria
    log_audit(
        session=session,
        user_id=current_user.id,
        action=AuditAction.CREATE,
        entity_name="Quote",
        entity_id=str(quote.id),
        new_values={
            "action": "NOVO_ORCAMENTO",
            "total": str(total_value),
            "branch": branch.name,
            "items_count": len(body.items),
        },
    )

    session.commit()
    session.refresh(quote)

    return {
        "error": None,
        "data": _build_quote_response(quote, session),
    }


@router.put("/quotes/{quote_id}")
def update_quote(
    quote_id: UUID,
    body: QuoteUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Atualiza um orçamento existente."""
    quote = session.get(Quote, quote_id)
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orçamento não encontrado",
        )

    # Só pode editar se estiver pendente
    if quote.status != "pendente":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não é possível editar um orçamento com status '{quote.status}'",
        )

    # Atualiza campos
    if body.customerId is not None:
        quote.customer_id = body.customerId
    if body.sellerId is not None:
        quote.seller_id = body.sellerId
    if body.grossValue is not None:
        quote.gross_value = Decimal(str(body.grossValue))
    if body.totalValue is not None:
        quote.total_value = Decimal(str(body.totalValue))
    if body.discount is not None:
        quote.discount = Decimal(str(body.discount))
    if body.observations is not None:
        quote.observations = body.observations
    if body.status is not None:
        quote.status = body.status

    quote.updated_at = br_now_naive()

    # Se houver itens, substitui
    if body.items is not None:
        # Remove itens antigos
        old_items = session.exec(
            select(QuoteItem).where(QuoteItem.quote_id == quote.id)
        ).all()
        for old in old_items:
            session.delete(old)

        # Adiciona novos itens
        for item_payload in body.items:
            product = session.get(Product, item_payload.productId)
            quote_item = QuoteItem(
                quote_id=quote.id,
                product_id=item_payload.productId,
                product_name=product.name if product else item_payload.name,
                quantity=item_payload.quantity,
                unit_price=Decimal(str(item_payload.unitPrice)),
                subtotal=Decimal(str(item_payload.subtotal)),
            )
            session.add(quote_item)

    session.commit()
    session.refresh(quote)

    return {
        "error": None,
        "data": _build_quote_response(quote, session),
    }


@router.post("/quotes/{quote_id}/convert")
def convert_quote_to_sale(
    quote_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Converte um orçamento em venda real.
    
    - Valida estoque
    - Cria Sale e SaleItems
    - Baixa estoque
    - Gera movimentação
    - Gera comissão do vendedor
    - Marca orçamento como 'aprovado'
    """
    quote = session.get(Quote, quote_id)
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orçamento não encontrado",
        )

    if quote.status != "pendente":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Orçamento com status '{quote.status}' não pode ser convertido",
        )

    # Verifica se expirou
    now = br_now_naive()
    if quote.expires_at and now > quote.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Orçamento expirado. Crie um novo orçamento.",
        )

    # Verifica estoque para todos os itens
    items_db = session.exec(
        select(QuoteItem).where(QuoteItem.quote_id == quote.id)
    ).all()

    if not items_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Orçamento sem itens",
        )

    items_to_process = []
    for item in items_db:
        product = session.get(Product, item.product_id)
        if not product or product.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto {item.product_id} não encontrado",
            )

        stock = session.exec(
            select(Stock).where(
                Stock.product_id == item.product_id,
                Stock.branch_id == quote.branch_id,
            )
        ).first()

        if not stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Produto '{product.name}' sem estoque nesta filial",
            )

        if Decimal(str(item.quantity)) > stock.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Estoque insuficiente para '{product.name}'. "
                    f"Disponível: {stock.quantity}, solicitado: {item.quantity}"
                ),
            )

        items_to_process.append({
            "quote_item": item,
            "product": product,
            "stock": stock,
        })

    # ── Calcula comissão ──
    commission_value = Decimal("0")
    if quote.seller_id:
        seller = session.get(User, quote.seller_id)
        if seller:
            commission_value = _calculate_commission(quote.total_value, seller)

    # ── Cria a venda ──
    from app.models.cash_sessions import CashSession
    from app.models.enums import MoveType

    sale = Sale(
        branch_id=quote.branch_id,
        user_id=current_user.id,
        customer_id=quote.customer_id,
        seller_id=quote.seller_id,
        gross_value=quote.gross_value,
        discount=quote.discount,
        total_value=quote.total_value,
        commission_value=commission_value,
        payment_method="orcamento",  # Método especial para venda por conversão
        payment_status="pending",    # Pendente — orçamento convertido sem pagamento
        observations=f"Convertido do orçamento {quote_id}",
    )
    session.add(sale)
    session.flush()

    # ── Cria SaleItems, baixa estoque, registra movimentação ──
    for i in items_to_process:
        qi = i["quote_item"]
        product = i["product"]
        stock = i["stock"]
        qty = Decimal(str(qi.quantity))

        # SaleItem
        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=qi.product_id,
            quantity=qi.quantity,
            unit_price=qi.unit_price,
            subtotal=qi.subtotal,
        )
        session.add(sale_item)

        # Baixa estoque
        stock.quantity = stock.quantity - qty
        stock.updated_at = now
        session.add(stock)

        # Move (type='out') - VENDA
        customer_name = None
        if quote.customer_id:
            cust = session.get(Customer, quote.customer_id)
            if cust:
                customer_name = cust.name
        desc_client = customer_name or "Consumidor Final (Orçamento)"

        move = Move(
            branch_id=quote.branch_id,
            product_id=qi.product_id,
            user_id=current_user.id,
            type=MoveType.OUT,
            quantity=qty,
            unit_price=product.unit_price,
            description=f"VENDA - {desc_client} (Conv. Orçamento)",
        )
        session.add(move)

    # ── Atualiza status do orçamento ──
    quote.status = "aprovado"
    quote.updated_at = now
    session.add(quote)

    # ── Auditoria ──
    from app.models.branches import Branch
    branch = session.get(Branch, quote.branch_id)

    log_audit(
        session=session,
        user_id=current_user.id,
        action=AuditAction.CREATE,
        entity_name="Sale",
        entity_id=str(sale.id),
        new_values={
            "action": "VENDA_POR_ORCAMENTO",
            "total": str(quote.total_value),
            "branch": branch.name if branch else "N/A",
            "items_count": len(items_db),
            "quote_id": str(quote.id),
        },
    )

    session.commit()
    session.refresh(sale)
    session.refresh(quote)

    # ── Resposta ──
    return {
        "error": None,
        "data": {
            "sale": {
                "id": str(sale.id),
                "totalValue": str(sale.total_value),
                "receiptNumber": sale.receipt_number,
                "status": "sale_created",
            },
            "quote": _build_quote_response(quote, session),
        },
    }


@router.post("/quotes/{quote_id}/cancel")
def cancel_quote(
    quote_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cancela um orçamento pendente."""
    quote = session.get(Quote, quote_id)
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orçamento não encontrado",
        )

    if quote.status != "pendente":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Orçamento com status '{quote.status}' não pode ser cancelado",
        )

    quote.status = "cancelado"
    quote.updated_at = br_now_naive()
    session.add(quote)
    session.commit()
    session.refresh(quote)

    return {
        "error": None,
        "data": _build_quote_response(quote, session),
    }
