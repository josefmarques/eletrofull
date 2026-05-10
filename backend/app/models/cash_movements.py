from sqlmodel import SQLModel, Field
from datetime import datetime
from uuid import UUID, uuid4
from decimal import Decimal
from typing import Optional


class CashMovement(SQLModel, table=True):
    """Modelo da tabela 'cash_movements' - Movimentações de caixa."""
    __tablename__ = "cash_movements"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    session_id: UUID = Field(nullable=False, foreign_key="cash_sessions.id")
    user_id: UUID = Field(nullable=False, foreign_key="users.id")
    type: str = Field(nullable=False)  # 'withdrawal' | 'deposit' | 'sale'
    amount: Decimal = Field(nullable=False, max_digits=12, decimal_places=2)
    description: Optional[str] = Field(default=None)
    reference_id: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
