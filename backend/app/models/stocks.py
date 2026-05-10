
from sqlmodel import SQLModel, Field
from datetime import datetime
from uuid import UUID, uuid4
from decimal import Decimal


class Stock(SQLModel, table=True):
    """Modelo da tabela 'stocks' - Estoque por filial."""
    __tablename__ = "stocks"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    branch_id: UUID = Field(nullable=False, foreign_key="branches.id")
    product_id: UUID = Field(nullable=False, foreign_key="products.id")
    quantity: Decimal = Field(default="0", nullable=False)
    minimum_quantity: Decimal = Field(
        default="0", nullable=False, sa_column_kwargs={"name": "minimo_quantity"}
    )
    maximum_quantity: Decimal = Field(default="0", nullable=False)
    updated_at: datetime = Field(default_factory=datetime.now, nullable=False)
