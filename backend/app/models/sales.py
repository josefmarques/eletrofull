from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Integer, Identity
from datetime import datetime
from uuid import UUID, uuid4
from decimal import Decimal
from typing import Optional

from app.core.timezone import br_now_naive


class Sale(SQLModel, table=True):
    """Modelo da tabela 'sales' - Vendas."""
    __tablename__ = "sales"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    branch_id: UUID = Field(nullable=False, foreign_key="branches.id")
    user_id: UUID = Field(nullable=False, foreign_key="users.id")
    customer_id: Optional[UUID] = Field(default=None, foreign_key="customers.id")
    seller_id: Optional[UUID] = Field(default=None, foreign_key="users.id")  # Vendedor responsável pela comissão
    gross_value: Decimal = Field(nullable=False, max_digits=12, decimal_places=2)
    discount: Decimal = Field(default="0", max_digits=12, decimal_places=2)
    total_value: Decimal = Field(nullable=False, max_digits=12, decimal_places=2)
    commission_value: Decimal = Field(default="0", max_digits=12, decimal_places=2)  # Comissão gerada na venda
    payment_method: str = Field(default="cash", nullable=False)
    payment_status: str = Field(default="pending", nullable=False)
    observations: Optional[str] = Field(default=None)
    receipt_number: int = Field(
        default=None,
        sa_column=Column(Integer, Identity(start=1, increment=1), nullable=False),
    )
    created_at: Optional[datetime] = Field(default_factory=br_now_naive)
