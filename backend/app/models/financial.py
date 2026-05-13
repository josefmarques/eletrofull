"""
Modelo de Transações Financeiras (Fluxo de Caixa).

Gerencia Contas a Receber (REVENUE) e Contas a Pagar (EXPENSE),
permitindo rastrear o fluxo de caixa com vínculo opcional a vendas.
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import SQLModel, Field

from app.core.timezone import br_now_naive
from app.models.enums import FinancialType, FinancialStatus


class FinancialTransaction(SQLModel, table=True):
    """Modelo da tabela 'financial_transactions' — Lançamentos financeiros.

    Representa uma entrada (REVENUE) ou saída (EXPENSE) no fluxo de caixa.
    Pode estar vinculada a uma venda (sale_id) para rastreabilidade.
    """
    __tablename__ = "financial_transactions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    tenant_id: str = Field(
        default="eletrosil",
        index=True,
        nullable=False,
        description="Identificador do tenant (ex: 'eletrosil', 'eletromarques')",
    )
    branch_id: UUID = Field(
        nullable=False,
        foreign_key="branches.id",
        description="ID da filial (Matriz/Norte/Sul)",
    )
    description: str = Field(nullable=False, max_length=255)
    amount: Decimal = Field(
        nullable=False, max_digits=12, decimal_places=2,
        description="Valor financeiro (sempre positivo; type define se é entrada ou saída)",
    )
    type: FinancialType = Field(
        nullable=False,
        description="REVENUE (entrada) ou EXPENSE (saída)",
    )
    status: FinancialStatus = Field(
        default=FinancialStatus.PENDING,
        nullable=False,
        description="PENDING (pendente), PAID (pago/baixado), CANCELED (cancelado)",
    )
    category: str = Field(
        nullable=False, max_length=50,
        description="Categoria do lançamento: 'venda', 'comissao', 'fixo', etc.",
    )
    due_date: datetime = Field(
        nullable=False,
        description="Data de vencimento do título",
    )
    payment_date: Optional[datetime] = Field(
        default=None,
        nullable=True,
        description="Data de pagamento efetivo (preenchido na baixa)",
    )
    sale_id: Optional[UUID] = Field(
        default=None,
        foreign_key="sales.id",
        nullable=True,
        description="Venda vinculada (opcional — vendas geram lançamentos automáticos)",
    )
    created_at: datetime = Field(default_factory=br_now_naive, nullable=False)
    updated_at: datetime = Field(
        default_factory=br_now_naive,
        nullable=False,
        sa_column_kwargs={"onupdate": br_now_naive},
    )
