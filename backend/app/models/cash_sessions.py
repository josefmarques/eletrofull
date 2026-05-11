from sqlmodel import SQLModel, Field
from datetime import datetime
from uuid import UUID, uuid4
from decimal import Decimal
from typing import Optional

from app.core.timezone import br_now_naive


class CashSession(SQLModel, table=True):
    """Modelo da tabela 'cash_sessions' - Sessões de caixa."""
    __tablename__ = "cash_sessions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    branch_id: UUID = Field(nullable=False, foreign_key="branches.id")
    user_id: UUID = Field(nullable=False, foreign_key="users.id")
    opening_balance: Decimal = Field(
        default="0.00", nullable=False, max_digits=12, decimal_places=2
    )
    closing_balance: Optional[Decimal] = Field(
        default=None, max_digits=12, decimal_places=2
    )
    total_sales: Optional[Decimal] = Field(
        default="0.00", max_digits=12, decimal_places=2
    )
    total_withdrawals: Optional[Decimal] = Field(
        default="0.00", max_digits=12, decimal_places=2
    )
    total_deposits: Optional[Decimal] = Field(
        default="0.00", max_digits=12, decimal_places=2
    )
    difference: Optional[Decimal] = Field(
        default=None, max_digits=12, decimal_places=2
    )
    status: str = Field(default="open", nullable=False)
    opened_at: Optional[datetime] = Field(default_factory=br_now_naive)
    closed_at: Optional[datetime] = Field(default=None)
    observations: Optional[str] = Field(default=None)
