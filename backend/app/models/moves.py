from sqlmodel import SQLModel, Field
from sqlalchemy import Column, Enum as SAEnum
from datetime import datetime
from uuid import UUID, uuid4
from decimal import Decimal
from typing import Optional

from app.core.timezone import br_now_naive
from .enums import MoveType


class Move(SQLModel, table=True):
    """Modelo da tabela 'moves' - Movimentações de estoque."""
    __tablename__ = "moves"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    branch_id: UUID = Field(nullable=False, foreign_key="branches.id")
    product_id: UUID = Field(nullable=False, foreign_key="products.id")
    user_id: UUID = Field(nullable=False, foreign_key="users.id")
    type: MoveType = Field(
        sa_column=Column(
            SAEnum(
                MoveType,
                values_callable=lambda obj: [e.value for e in obj],
                create_type=False,
                nullable=False,
            )
        ),
    )
    quantity: Decimal = Field(nullable=False)
    unit_price: Decimal = Field(nullable=False)
    description: Optional[str] = Field(default=None, max_length=255)
    transfer_id: Optional[UUID] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=br_now_naive, nullable=False)
