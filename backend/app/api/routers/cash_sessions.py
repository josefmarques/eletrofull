from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime
from decimal import Decimal

from sqlalchemy import func

from app.core.database import get_session
from app.models.cash_sessions import CashSession
from app.models.cash_movements import CashMovement
from app.models.sales import Sale
from app.models.payments import Payment
from app.api.dependencies import get_current_user
from app.models.users import User

router = APIRouter(tags=["cash-sessions"])


# ─── Schemas ─────────────────────────────────────────────────────────────────


class OpenSessionRequest(BaseModel):
    branchId: UUID
    openingBalance: str


class CloseSessionRequest(BaseModel):
    closingBalance: str
    observations: Optional[str] = None


class MovementRequest(BaseModel):
    amount: str
    description: Optional[str] = None


# ─── Endpoints ───────────────────────────────────────────────────────────────


@router.get("/cash-sessions/current")
def get_current_session(
    branchId: UUID = Query(..., alias="branchId"),
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Retorna a sessão de caixa atual (aberta) para uma filial."""
    current = session.exec(
        select(CashSession).where(
            CashSession.branch_id == branchId,
            CashSession.status == "open",
        )
    ).first()

    if not current:
        return {"error": None, "data": None}

    payment_totals = _get_payment_totals(current, session)
    withdrawals, deposits = _get_cash_movement_totals(current, session)

    return {
        "error": None,
        "data": _build_session_response(
            current,
            payment_totals=payment_totals,
            total_withdrawals=withdrawals,
            total_deposits=deposits,
        ),
    }


@router.get("/cash-sessions")
def list_sessions(
    branchId: UUID = Query(..., alias="branchId"),
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Lista sessões de caixa de uma filial."""
    statement = (
        select(CashSession)
        .where(CashSession.branch_id == branchId)
        .order_by(CashSession.opened_at.desc())
        .offset(offset)
        .limit(limit)
    )
    sessions = session.exec(statement).all()

    return {
        "error": None,
        "data": [
            _build_session_response(
                s,
                payment_totals=_get_payment_totals(s, session),
                total_withdrawals=w,
                total_deposits=d,
            )
            for s in sessions
            for w, d in [_get_cash_movement_totals(s, session)]
        ],
    }


@router.post("/cash-sessions", status_code=status.HTTP_201_CREATED)
def open_session(
    body: OpenSessionRequest,
    db_session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Abre uma nova sessão de caixa para a filial."""
    # Verifica se já existe sessão aberta
    existing = db_session.exec(
        select(CashSession).where(
            CashSession.branch_id == body.branchId,
            CashSession.status == "open",
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma sessão de caixa aberta para esta filial",
        )

    cash_session = CashSession(
        branch_id=body.branchId,
        user_id=current_user.id,
        opening_balance=Decimal(str(body.openingBalance)),
        status="open",
    )
    db_session.add(cash_session)
    db_session.commit()
    db_session.refresh(cash_session)

    return {
        "error": None,
        "data": _build_session_response(cash_session),
    }


@router.post("/cash-sessions/{session_id}/close")
def close_session(
    session_id: UUID,
    body: CloseSessionRequest,
    db_session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Fecha uma sessão de caixa."""
    cash_session = db_session.get(CashSession, session_id)
    if not cash_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão de caixa não encontrada",
        )

    if cash_session.status != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sessão de caixa já está fechada",
        )

    # Calcula totais
    total_sales = db_session.exec(
        select(Sale).where(
            Sale.branch_id == cash_session.branch_id,
            Sale.created_at >= cash_session.opened_at,
            Sale.payment_status == "completed",
        )
    ).all()

    total_sales_value = sum((s.total_value for s in total_sales), Decimal("0"))

    total_withdrawals = db_session.exec(
        select(CashMovement).where(
            CashMovement.session_id == session_id,
            CashMovement.type == "withdrawal",
        )
    ).all()
    total_withdrawals_value = sum((m.amount for m in total_withdrawals), Decimal("0"))

    total_deposits = db_session.exec(
        select(CashMovement).where(
            CashMovement.session_id == session_id,
            CashMovement.type == "deposit",
        )
    ).all()
    total_deposits_value = sum((m.amount for m in total_deposits), Decimal("0"))

    expected = cash_session.opening_balance + total_sales_value + total_deposits_value - total_withdrawals_value
    difference = Decimal(str(body.closingBalance)) - expected

    cash_session.closing_balance = Decimal(str(body.closingBalance))
    cash_session.total_sales = total_sales_value
    cash_session.total_withdrawals = total_withdrawals_value
    cash_session.total_deposits = total_deposits_value
    cash_session.difference = difference
    cash_session.status = "closed"
    cash_session.closed_at = datetime.now()
    cash_session.observations = body.observations

    db_session.add(cash_session)
    db_session.commit()
    db_session.refresh(cash_session)

    return {
        "error": None,
        "data": _build_session_response(cash_session),
    }


@router.post("/cash-sessions/{session_id}/withdrawal")
def add_withdrawal(
    session_id: UUID,
    body: MovementRequest,
    db_session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Registra uma sangria (retirada de dinheiro) na sessão."""
    cash_session = db_session.get(CashSession, session_id)
    if not cash_session or cash_session.status != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sessão de caixa não está aberta",
        )

    movement = CashMovement(
        session_id=session_id,
        user_id=current_user.id,
        type="withdrawal",
        amount=Decimal(str(body.amount)),
        description=body.description,
    )
    db_session.add(movement)
    db_session.commit()
    db_session.refresh(movement)

    return {
        "error": None,
        "data": {
            "id": str(movement.id),
            "type": movement.type,
            "amount": movement.amount,
            "description": movement.description,
            "createdAt": movement.created_at.isoformat() if movement.created_at else None,
        },
    }


@router.post("/cash-sessions/{session_id}/deposit")
def add_deposit(
    session_id: UUID,
    body: MovementRequest,
    db_session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Registra um aporte (entrada de dinheiro) na sessão."""
    cash_session = db_session.get(CashSession, session_id)
    if not cash_session or cash_session.status != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sessão de caixa não está aberta",
        )

    movement = CashMovement(
        session_id=session_id,
        user_id=current_user.id,
        type="deposit",
        amount=Decimal(str(body.amount)),
        description=body.description,
    )
    db_session.add(movement)
    db_session.commit()
    db_session.refresh(movement)

    return {
        "error": None,
        "data": {
            "id": str(movement.id),
            "type": movement.type,
            "amount": movement.amount,
            "description": movement.description,
            "createdAt": movement.created_at.isoformat() if movement.created_at else None,
        },
    }


@router.get("/cash-sessions/{session_id}/report")
def get_session_report(
    session_id: UUID,
    db_session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Retorna o relatório detalhado de uma sessão de caixa."""
    cash_session = db_session.get(CashSession, session_id)
    if not cash_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão de caixa não encontrada",
        )

    # Busca movimentos da sessão
    movements = db_session.exec(
        select(CashMovement)
        .where(CashMovement.session_id == session_id)
        .order_by(CashMovement.created_at.asc())
    ).all()

    expected = cash_session.opening_balance + (cash_session.total_sales or Decimal("0")) + (cash_session.total_deposits or Decimal("0")) - (cash_session.total_withdrawals or Decimal("0"))

    withdrawals_real, deposits_real = _get_cash_movement_totals(cash_session, db_session)
    payment_totals = _get_payment_totals(cash_session, db_session)

    expected_real = (
        cash_session.opening_balance
        + (cash_session.total_sales or Decimal("0"))
        + deposits_real
        - withdrawals_real
    )

    return {
        "error": None,
        "data": {
            "session": _build_session_response(
                cash_session,
                payment_totals=payment_totals,
                total_withdrawals=withdrawals_real,
                total_deposits=deposits_real,
            ),
            "expectedBalance": expected_real,
            "difference": cash_session.difference or Decimal("0"),
            "movements": [
                {
                    "id": str(m.id),
                    "type": m.type,
                    "amount": m.amount,
                    "description": m.description,
                    "createdAt": m.created_at.isoformat() if m.created_at else None,
                }
                for m in movements
            ],
        },
    }


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _build_session_response(
    s: CashSession,
    payment_totals: Optional[dict] = None,
    total_withdrawals: Optional[Decimal] = None,
    total_deposits: Optional[Decimal] = None,
) -> dict:
    return {
        "id": str(s.id),
        "branchId": str(s.branch_id),
        "userId": str(s.user_id),
        "openingBalance": s.opening_balance,
        "closingBalance": s.closing_balance,
        "totalSales": s.total_sales or Decimal("0"),
        "totalWithdrawals": total_withdrawals or s.total_withdrawals or Decimal("0"),
        "totalDeposits": total_deposits or s.total_deposits or Decimal("0"),
        "difference": s.difference,
        "status": s.status,
        "openedAt": s.opened_at.isoformat() if s.opened_at else None,
        "closedAt": s.closed_at.isoformat() if s.closed_at else None,
        "observations": s.observations,
        "paymentTotals": payment_totals,
    }


def _get_payment_totals(cash_session: CashSession, db_session: Session) -> dict:
    """Retorna os totais agregados por método de pagamento para a sessão.

    Faz JOIN entre Payment -> Sale e filtra pela branch e período da sessão.
    """
    if not cash_session.opened_at:
        return _empty_payment_totals()

    statement = (
        select(Payment.method, func.sum(Payment.amount).label("total"))
        .join(Sale, Payment.sale_id == Sale.id)
        .where(
            Sale.branch_id == cash_session.branch_id,
            Sale.created_at >= cash_session.opened_at,
        )
        .group_by(Payment.method)
    )

    results = db_session.exec(statement).all()

    payment_totals = {method: total for method, total in results}

    # Garante que todos os métodos apareçam, mesmo com valor zero
    for method in ("cash", "pix", "credit_card", "debit_card"):
        if method not in payment_totals:
            payment_totals[method] = Decimal("0.00")

    return payment_totals


def _empty_payment_totals() -> dict:
    return {
        "cash": Decimal("0.00"),
        "pix": Decimal("0.00"),
        "credit_card": Decimal("0.00"),
        "debit_card": Decimal("0.00"),
    }


def _get_cash_movement_totals(cash_session: CashSession, db_session: Session) -> tuple[Decimal, Decimal]:
    """Retorna (total_withdrawals, total_deposits) calculados em tempo real do banco.

    Usa SQLAlchemy puro (execute) em vez de SQLModel (exec) para garantir que
    a cláusula FROM seja explícita e não haja CROSS JOIN com outras tabelas.
    """
    from sqlalchemy import select as sa_select

    # ── Query A: SOMA das sangrias — isolada, SEM JOIN ──────────────────
    stmt_withdrawal = (
        sa_select(func.sum(CashMovement.amount))
        .select_from(CashMovement)
        .where(
            CashMovement.session_id == cash_session.id,
            CashMovement.type == "withdrawal",
        )
    )
    row_w = db_session.execute(stmt_withdrawal).one()
    # row_w é uma Row (tupla); extraímos o primeiro elemento
    raw_w = row_w[0] if row_w is not None else None
    total_withdrawals = raw_w if raw_w is not None else Decimal("0.00")

    # ── Query B: SOMA dos aportes — isolada, SEM JOIN ───────────────────
    stmt_deposit = (
        sa_select(func.sum(CashMovement.amount))
        .select_from(CashMovement)
        .where(
            CashMovement.session_id == cash_session.id,
            CashMovement.type == "deposit",
        )
    )
    row_d = db_session.execute(stmt_deposit).one()
    raw_d = row_d[0] if row_d is not None else None
    total_deposits = raw_d if raw_d is not None else Decimal("0.00")

    return total_withdrawals, total_deposits
