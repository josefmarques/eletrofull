from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

from app.core.database import get_session
from app.models.categories import Category
from app.models.products import Product
from app.api.dependencies import get_current_user
from app.models.users import User

router = APIRouter(tags=["categories"])


# ─── Schemas ─────────────────────────────────────────────────────────────────


class CategoryCreate(BaseModel):
    name: str


class CategoryUpdate(BaseModel):
    name: Optional[str] = None


# ─── Endpoints ───────────────────────────────────────────────────────────────


@router.get("/categories")
def list_categories(
    includeProductCount: bool = Query(False, alias="includeProductCount"),
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Lista todas as categorias (exceto deletadas). Opcionalmente inclui contagem de produtos."""
    statement = select(Category).where(Category.deleted_at.is_(None)).order_by(Category.name)
    categories = session.exec(statement).all()

    result = []
    for cat in categories:
        item = {
            "id": str(cat.id),
            "name": cat.name,
            "createdAt": cat.created_at.isoformat() if cat.created_at else None,
            "updatedAt": cat.updated_at.isoformat() if cat.updated_at else None,
        }

        if includeProductCount:
            count_stmt = select(func.count(Product.id)).where(
                Product.category_id == cat.id,
                Product.deleted_at.is_(None),
            )
            count = session.exec(count_stmt).one()
            item["productCount"] = count

        result.append(item)

    return {"error": None, "data": result}


@router.get("/categories/{category_id}")
def get_category(
    category_id: UUID,
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Retorna uma categoria pelo ID."""
    category = session.get(Category, category_id)
    if not category or category.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada",
        )

    return {
        "error": None,
        "data": {
            "id": str(category.id),
            "name": category.name,
            "createdAt": category.created_at.isoformat() if category.created_at else None,
            "updatedAt": category.updated_at.isoformat() if category.updated_at else None,
        },
    }


@router.post("/categories", status_code=status.HTTP_201_CREATED)
def create_category(
    body: CategoryCreate,
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Cria uma nova categoria."""
    # Verifica se já existe categoria com mesmo nome
    existing = session.exec(
        select(Category).where(
            Category.name == body.name,
            Category.deleted_at.is_(None),
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma categoria com este nome",
        )

    category = Category(name=body.name)
    session.add(category)
    session.commit()
    session.refresh(category)

    return {
        "error": None,
        "data": {
            "id": str(category.id),
            "name": category.name,
            "createdAt": category.created_at.isoformat() if category.created_at else None,
            "updatedAt": category.updated_at.isoformat() if category.updated_at else None,
        },
    }


@router.put("/categories/{category_id}")
def update_category(
    category_id: UUID,
    body: CategoryUpdate,
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Atualiza uma categoria."""
    category = session.get(Category, category_id)
    if not category or category.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada",
        )

    if body.name is not None:
        # Verifica duplicidade
        existing = session.exec(
            select(Category).where(
                Category.name == body.name,
                Category.id != category_id,
                Category.deleted_at.is_(None),
            )
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe outra categoria com este nome",
            )
        category.name = body.name

    category.updated_at = datetime.now()
    session.add(category)
    session.commit()
    session.refresh(category)

    return {
        "error": None,
        "data": {
            "id": str(category.id),
            "name": category.name,
            "createdAt": category.created_at.isoformat() if category.created_at else None,
            "updatedAt": category.updated_at.isoformat() if category.updated_at else None,
        },
    }


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: UUID,
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Soft delete de uma categoria (marca deleted_at)."""
    category = session.get(Category, category_id)
    if not category or category.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada",
        )

    # Verifica se há produtos vinculados
    products_count = session.exec(
        select(func.count(Product.id)).where(
            Product.category_id == category_id,
            Product.deleted_at.is_(None),
        )
    ).one()

    if products_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Não é possível excluir: existem {products_count} produto(s) vinculado(s) a esta categoria",
        )

    category.deleted_at = datetime.now()
    session.add(category)
    session.commit()

    return None  # 204 No Content
