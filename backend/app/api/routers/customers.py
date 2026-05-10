from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

from app.core.database import get_session
from app.models.customers import Customer
from app.api.dependencies import get_current_user
from app.models.users import User

router = APIRouter(tags=["customers"])


# ─── Schemas ─────────────────────────────────────────────────────────────────


class CustomerCreate(BaseModel):
    name: str
    cpf_cnpj: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _build_customer_response(customer: Customer) -> dict:
    return {
        "id": str(customer.id),
        "name": customer.name,
        "cpfCnpj": customer.cpf_cnpj,
        "email": customer.email,
        "phone": customer.phone,
        "points": customer.points or 0,
        "createdAt": customer.created_at.isoformat() if customer.created_at else None,
        "updatedAt": customer.updated_at.isoformat() if customer.updated_at else None,
    }


# ─── Endpoints ───────────────────────────────────────────────────────────────


@router.get("/customers")
def search_customers(
    name: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Busca clientes por nome ou retorna todos."""
    statement = select(Customer).where(Customer.deleted_at.is_(None))

    if name:
        statement = statement.where(Customer.name.ilike(f"%{name}%"))

    statement = statement.order_by(Customer.name).limit(limit)
    customers = session.exec(statement).all()

    return {
        "error": None,
        "data": [_build_customer_response(c) for c in customers],
    }


@router.get("/customers/{customer_id}")
def get_customer(
    customer_id: UUID,
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Retorna um cliente pelo ID."""
    customer = session.get(Customer, customer_id)
    if not customer or customer.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado",
        )

    return {
        "error": None,
        "data": _build_customer_response(customer),
    }


@router.post("/customers", status_code=status.HTTP_201_CREATED)
def create_customer(
    body: CustomerCreate,
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Cria um novo cliente."""
    # Verifica duplicidade de CPF/CNPJ
    if body.cpf_cnpj:
        existing = session.exec(
            select(Customer).where(
                Customer.cpf_cnpj == body.cpf_cnpj,
                Customer.deleted_at.is_(None),
            )
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe um cliente com este CPF/CNPJ",
            )

    customer = Customer(
        name=body.name,
        cpf_cnpj=body.cpf_cnpj,
        email=body.email,
        phone=body.phone,
    )
    session.add(customer)
    session.commit()
    session.refresh(customer)

    return {
        "error": None,
        "data": _build_customer_response(customer),
    }
