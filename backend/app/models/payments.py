from sqlmodel import SQLModel, Field
from datetime import datetime
from uuid import UUID, uuid4
from decimal import Decimal
from typing import Optional

from app.core.timezone import br_now_naive
from app.models.enums import PaymentMethod


class Payment(SQLModel, table=True):
    """Modelo da tabela 'payments' - Pagamentos de vendas.

    Suporta múltiplos métodos de pagamento por venda (split payment).
    Ex: R$ 50 em Dinheiro + R$ 50 no PIX para uma única venda.
    """
    __tablename__ = "payments"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    sale_id: UUID = Field(nullable=False, foreign_key="sales.id")
    method: PaymentMethod = Field(nullable=False)
    amount: Decimal = Field(nullable=False, max_digits=12, decimal_places=2)
    created_at: Optional[datetime] = Field(default_factory=br_now_naive)
