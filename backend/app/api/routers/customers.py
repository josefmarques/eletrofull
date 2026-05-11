"""
Router de Clientes — Eletrosil.

╔══════════════════════════════════════════════════════════════════════════════╗
║ TRAVA DEFINITIVA DE CPF DUPLICADO                                          ║
║                                                                             ║
║ PROBLEMA: O banco já tem UNIQUE constraint, mas dados estão chegando        ║
║ como NULL (cpf_cnpj: "" → None). A UNIQUE permite múltiplos NULLs, então   ║
║ duplicatas passam.                                                          ║
║                                                                             ║
║ SOLUÇÃO:                                                                    ║
║ 1. NORMALIZAÇÃO no Schema (@field_validator): "" → None ANTES da rota      ║
║ 2. VERIFICAÇÃO MANUAL: SELECT por CPF antes do INSERT                      ║
║ 3. RETORNO 400: "CPF já cadastrado" (sem diferenciar nome igual/diferente) ║
║ 4. FALLBACK: UNIQUE constraint no banco (race condition)                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from pydantic import BaseModel, field_validator, Field, ConfigDict
from uuid import UUID
from typing import Optional
from datetime import datetime

from app.core.database import get_session
from app.models.customers import Customer
from app.api.dependencies import get_current_user
from app.models.users import User
from app.models.audit import AuditAction
from app.core.audit import log_audit
from sqlalchemy.exc import IntegrityError

router = APIRouter(tags=["customers"])


# ─── Schemas ─────────────────────────────────────────────────────────────────


class CustomerCreate(BaseModel):
    """
    Schema de criação de cliente.

    ═══════════════════════════════════════════════════════════════════════════
    ALIAS (cpfCnpj → cpf_cnpj)
    ═══════════════════════════════════════════════════════════════════════════
    O campo `cpf_cnpj` possui alias `cpfCnpj` porque o frontend envia
    os dados em camelCase (padrão JavaScript). Sem o alias, o campo
    era silenciosamente ignorado pelo Pydantic, resultando em
    cpf_cnpj = None em TODAS as requisições, o que permitia
    duplicatas (NULLs são únicos por padrão no PostgreSQL).

    Com `populate_by_name = True`, aceitamos AMBAS as formas:
    - `{"cpf_cnpj": "..."}` (Python snake_case)
    - `{"cpfCnpj": "..."}`   (Frontend camelCase)
    ═══════════════════════════════════════════════════════════════════════════
    """
    model_config = ConfigDict(populate_by_name=True)

    name: str
    cpf_cnpj: Optional[str] = Field(default=None, alias="cpfCnpj")
    email: Optional[str] = None
    phone: Optional[str] = None

    @field_validator("cpf_cnpj")
    @classmethod
    def normalizar_cpf(cls, value: Optional[str]) -> Optional[str]:
        """
        NORMALIZAÇÃO OBRIGATÓRIA — roda ANTES de qualquer código da rota.

        - Se o frontend enviar "" ou "  " → converte para None
        - Se enviar None (ou omitir o campo) → mantém None
        - Se enviar um CPF válido → mantém (remove espaços nas bordas)
        """
        if value is None:
            return None
        stripped = value.strip()
        return stripped if stripped else None


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
    """Busca clientes por nome ou retorna todos (global — sem filtro por filial)."""
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
    """
    Cria um novo cliente com VERIFICAÇÃO MANUAL de CPF.

    ═══════════════════════════════════════════════════════════════════════════
    FLUXO:
    1. O Schema Validator (@field_validator) já normalizou cpf_cnpj:
       - "" → None
       - "   " → None
       - "123.456.789-00" → "123.456.789-00"
    2. Se body.cpf_cnpj for None → cliente SEM CPF → prossegue
    3. Se body.cpf_cnpj for uma string válida → busca no banco
    4. Se encontrar → ERRO 400 "CPF já cadastrado"
    5. Se não encontrar → INSERT + AUDITORIA
    ═══════════════════════════════════════════════════════════════════════════
    """
    # ── CPF já normalizado pelo @field_validator ──
    cpf = body.cpf_cnpj

    # ═══════════════════════════════════════════════════════════════════════
    # VERIFICAÇÃO MANUAL — SELECT antes de INSERT
    # ═══════════════════════════════════════════════════════════════════════
    # Se cpf for uma string não vazia, busca no banco.
    # Se encontrou → bloqueia com JSON estruturado.
    if cpf:
        existing = session.exec(
            select(Customer).where(
                Customer.cpf_cnpj == cpf,
                Customer.deleted_at.is_(None),
            )
        ).first()
        if existing:
            return JSONResponse(
                status_code=status.HTTP_409_CONFLICT,
                content={
                    "error": "conflict",
                    "message": "Este CPF já está cadastrado no sistema.",
                },
            )

    # ═══════════════════════════════════════════════════════════════════════
    # INSERT
    # ═══════════════════════════════════════════════════════════════════════
    customer = Customer(
        name=body.name,
        cpf_cnpj=cpf,
        email=body.email,
        phone=body.phone,
    )
    session.add(customer)

    # Proteção contra race condition (2 requests simultâneos com mesmo CPF)
    try:
        session.flush()
    except IntegrityError as e:
        session.rollback()
        # Identifica qual constraint foi violada
        constraint_msg = str(e.orig) if hasattr(e, "orig") else str(e)
        if "unique_cpf_cnpj" in constraint_msg:
            return JSONResponse(
                status_code=status.HTTP_409_CONFLICT,
                content={
                    "error": "conflict",
                    "message": "Este CPF já está cadastrado no sistema.",
                },
            )
        # Outro erro de integridade (genérico)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Erro de integridade no banco de dados.",
        )

    # ═══════════════════════════════════════════════════════════════════════
    # AUDITORIA
    # ═══════════════════════════════════════════════════════════════════════
    audit_new_values = {
        "action": "NOVO_CLIENTE",
        "name": customer.name,
        "cpf_cnpj": customer.cpf_cnpj,
        "email": customer.email,
        "phone": customer.phone,
        "points": customer.points,
        "created_at": customer.created_at.isoformat() if customer.created_at else None,
    }

    log_audit(
        session=session,
        user_id=_current_user.id,
        action=AuditAction.CREATE,
        entity_name="Customer",
        entity_id=str(customer.id),
        new_values=audit_new_values,
    )

    session.commit()
    session.refresh(customer)

    return {
        "error": None,
        "data": _build_customer_response(customer),
    }
