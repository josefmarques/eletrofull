from sqlmodel import SQLModel, Field
from datetime import datetime, timedelta
from uuid import UUID, uuid4
from decimal import Decimal
from typing import Optional

from app.core.timezone import br_now_naive


class Quote(SQLModel, table=True):
    """Modelo da tabela 'quotes' - Orcamentos/Propostas.
    
    Um orcamento eh uma pre-venda: lista itens, calcula totais,
    mas NAO baixa estoque e NAO gera movimentacao financeira.
    """
    __tablename__ = "quotes"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    branch_id: UUID = Field(nullable=False, foreign_key="branches.id")
    user_id: UUID = Field(nullable=False, foreign_key="users.id")
    customer_id: Optional[UUID] = Field(default=None, foreign_key="customers.id")
    seller_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    gross_value: Decimal = Field(nullable=False, max_digits=12, decimal_places=2)
    discount: Decimal = Field(default="0", max_digits=12, decimal_places=2)
    total_value: Decimal = Field(nullable=False, max_digits=12, decimal_places=2)
    status: str = Field(default="pendente", nullable=False)
    expires_at: datetime = Field(nullable=False)
    observations: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default_factory=br_now_naive)
    updated_at: Optional[datetime] = Field(default_factory=br_now_naive)


class QuoteItem(SQLModel, table=True):
    """Modelo da tabela 'quote_items' - Itens dos orcamentos."""
    __tablename__ = "quote_items"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    quote_id: UUID = Field(nullable=False, foreign_key="quotes.id")
    product_id: UUID = Field(nullable=False, foreign_key="products.id")
    product_name: Optional[str] = Field(default=None)
    quantity: int = Field(nullable=False)
    unit_price: Decimal = Field(nullable=False, max_digits=12, decimal_places=2)
    subtotal: Decimal = Field(nullable=False, max_digits=12, decimal_places=2)
