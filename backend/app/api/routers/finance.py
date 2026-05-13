"""
Router de Transações Financeiras (Fluxo de Caixa).

Endpoints:
- GET  /finance          → Listar transações com filtros
- PATCH /finance/{id}/pay → Baixar um título (status → PAID)
- GET  /finance/summary  → Resumo do dashboard financeiro

As respostas usam nomes em PT-BR para a interface.
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, func

from app.core.database import get_session
from app.core.timezone import br_now_naive
from app.models.financial import FinancialTransaction
from app.models.enums import FinancialType, FinancialStatus
from app.api.dependencies import get_current_user
from app.models.users import User

router = APIRouter(prefix="/finance", tags=["finance"])


# ─── Schemas de Resposta (PT-BR) ───────────────────────────────────────────


def _transaction_to_dict(tx: FinancialTransaction) -> dict:
    """Converte um FinancialTransaction para dict com nomes em PT-BR."""
    return {
        "id": str(tx.id),
        "tenantId": tx.tenant_id,
        "branchId": str(tx.branch_id),
        "descricao": tx.description,
        "valor": str(tx.amount),
        "tipo": tx.type.value,           # "revenue" ou "expense"
        "tipoLabel": "Entrada" if tx.type == FinancialType.REVENUE else "Saída",
        "status": tx.status.value,        # "pending", "paid", "canceled"
        "statusLabel": _status_label(tx.status),
        "categoria": tx.category,
        "vencimento": tx.due_date.isoformat() if tx.due_date else None,
        "dataPagamento": tx.payment_date.isoformat() if tx.payment_date else None,
        "saleId": str(tx.sale_id) if tx.sale_id else None,
        "createdAt": tx.created_at.isoformat() if tx.created_at else None,
        "updatedAt": tx.updated_at.isoformat() if tx.updated_at else None,
    }


def _status_label(status: FinancialStatus) -> str:
    labels = {
        FinancialStatus.PENDING: "Pendente",
        FinancialStatus.PAID: "Pago",
        FinancialStatus.CANCELED: "Cancelado",
    }
    return labels.get(status, status.value)


# ─── GET /finance — Listar transações ──────────────────────────────────────


@router.get("")
def list_transactions(
    tenant_id: Optional[str] = Query(None, alias="tenantId"),
    status: Optional[FinancialStatus] = Query(None),
    tipo: Optional[FinancialType] = Query(None, alias="tipo"),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    branch_id: Optional[UUID] = Query(None, alias="branchId"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """
    Lista transações financeiras com filtros opcionais.

    Filtros disponíveis:
    - tenantId: identifica o tenant (eletrosil, eletromarques)
    - status: pending, paid, canceled
    - tipo: revenue (entrada), expense (saída)
    - startDate / endDate: intervalo de vencimento (formato ISO)
    - branchId: filial específica
    """
    query = select(FinancialTransaction).order_by(FinancialTransaction.due_date.desc())

    if tenant_id:
        query = query.where(FinancialTransaction.tenant_id == tenant_id)
    if status:
        query = query.where(FinancialTransaction.status == status)
    if tipo:
        query = query.where(FinancialTransaction.type == tipo)
    if branch_id:
        query = query.where(FinancialTransaction.branch_id == branch_id)
    if start_date:
        try:
            dt_start = datetime.fromisoformat(start_date)
            query = query.where(FinancialTransaction.due_date >= dt_start)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de startDate inválido. Use ISO 8601 (ex: 2025-01-01 ou 2025-01-01T00:00:00)",
            )
    if end_date:
        try:
            dt_end = datetime.fromisoformat(end_date)
            query = query.where(FinancialTransaction.due_date <= dt_end)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de endDate inválido. Use ISO 8601 (ex: 2025-12-31)",
            )

    total_query = select(func.count()).select_from(query.subquery())
    total = session.exec(total_query).one()

    query = query.offset(offset).limit(limit)
    transactions = session.exec(query).all()

    return {
        "error": None,
        "data": [_transaction_to_dict(tx) for tx in transactions],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


# ─── PATCH /finance/{id}/pay — Baixar título ────────────────────────────────


@router.patch("/{id}/pay")
def pay_transaction(
    id: UUID,
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """
    Realiza a baixa de um título financeiro.

    Altera o status para PAID e define payment_date como a data/hora atual.
    Se o título já estiver PAID ou CANCELED, retorna erro 409.
    """
    transaction = session.get(FinancialTransaction, id)
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transação financeira não encontrada",
        )

    if transaction.status == FinancialStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta transação já foi baixada (paga)",
        )

    if transaction.status == FinancialStatus.CANCELED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível baixar uma transação cancelada",
        )

    transaction.status = FinancialStatus.PAID
    transaction.payment_date = br_now_naive()
    transaction.updated_at = br_now_naive()

    session.add(transaction)
    session.commit()
    session.refresh(transaction)

    return {
        "error": None,
        "message": "Título baixado com sucesso",
        "data": _transaction_to_dict(transaction),
    }


# ─── GET /finance/summary — Resumo do Dashboard ─────────────────────────────


@router.get("/summary")
def get_summary(
    tenant_id: Optional[str] = Query(None, alias="tenantId"),
    branch_id: Optional[UUID] = Query(None, alias="branchId"),
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """
    Retorna um resumo financeiro para o dashboard.

    - totalRecebido: soma de REVENUE com status PAID
    - totalPago: soma de EXPENSE com status PAID
    - saldoAtual: totalRecebido - totalPago

    Se os valores forem iguais, saldo = 0.
    """
    # Filtro base
    base_filters = []
    if tenant_id:
        base_filters.append(FinancialTransaction.tenant_id == tenant_id)
    if branch_id:
        base_filters.append(FinancialTransaction.branch_id == branch_id)

    # Total Recebido (REVENUE PAID)
    query_revenue = select(
        func.coalesce(func.sum(FinancialTransaction.amount), 0)
    ).where(
        FinancialTransaction.type == FinancialType.REVENUE,
        FinancialTransaction.status == FinancialStatus.PAID,
        *base_filters,
    )
    total_received = session.exec(query_revenue).one()
    total_received = Decimal(str(total_received))

    # Total Pago (EXPENSE PAID)
    query_expense = select(
        func.coalesce(func.sum(FinancialTransaction.amount), 0)
    ).where(
        FinancialTransaction.type == FinancialType.EXPENSE,
        FinancialTransaction.status == FinancialStatus.PAID,
        *base_filters,
    )
    total_paid = session.exec(query_expense).one()
    total_paid = Decimal(str(total_paid))

    # Saldo
    balance = total_received - total_paid

    # Pendentes (para informação adicional)
    query_pending_revenue = select(
        func.coalesce(func.sum(FinancialTransaction.amount), 0)
    ).where(
        FinancialTransaction.type == FinancialType.REVENUE,
        FinancialTransaction.status == FinancialStatus.PENDING,
        *base_filters,
    )
    pending_revenue = session.exec(query_pending_revenue).one()

    query_pending_expense = select(
        func.coalesce(func.sum(FinancialTransaction.amount), 0)
    ).where(
        FinancialTransaction.type == FinancialType.EXPENSE,
        FinancialTransaction.status == FinancialStatus.PENDING,
        *base_filters,
    )
    pending_expense = session.exec(query_pending_expense).one()

    return {
        "error": None,
        "data": {
            "totalRecebido": str(total_received),
            "totalPago": str(total_paid),
            "saldoAtual": str(balance),
            "aReceber": str(pending_revenue),
            "aPagar": str(pending_expense),
        },
    }
