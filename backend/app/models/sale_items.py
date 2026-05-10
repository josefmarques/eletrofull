from sqlmodel import SQLModel, Field
from uuid import UUID, uuid4
from decimal import Decimal


class SaleItem(SQLModel, table=True):
    """Modelo da tabela 'sale_items' - Itens das vendas."""
    __tablename__ = "sale_items"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    sale_id: UUID = Field(nullable=False, foreign_key="sales.id")
    product_id: UUID = Field(nullable=False, foreign_key="products.id")
    quantity: int = Field(nullable=False)
    unit_price: Decimal = Field(nullable=False, max_digits=12, decimal_places=2)
    subtotal: Decimal = Field(nullable=False, max_digits=12, decimal_places=2)
