from sqlmodel import SQLModel, Field
from sqlalchemy import Column, String, UniqueConstraint
from datetime import datetime
from uuid import UUID, uuid4
from typing import Optional


class SupplierProductMap(SQLModel, table=True):
    """Mapeia o código do produto do fornecedor para o produto local (Eletrosil).

    Permite que o sistema "aprenda" associações: numa próxima nota do mesmo
    fornecedor, os itens já virão vinculados automaticamente.

    A constraint UNIQUE (supplier_cnpj, supplier_product_code) garante que
    não haja duplicidade de mapeamento por fornecedor + código.
    """
    __tablename__ = "supplier_product_maps"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    supplier_cnpj: str = Field(
        sa_column=Column(String(20), nullable=False, index=True),
    )
    supplier_product_code: str = Field(
        sa_column=Column(String(60), nullable=False),
    )
    local_product_id: UUID = Field(
        nullable=False, foreign_key="products.id",
    )
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)

    # Garantia de unicidade: um mesmo código de fornecedor mapeia pra UM produto local
    __table_args__ = (
        UniqueConstraint(
            "supplier_cnpj",
            "supplier_product_code",
            name="uq_supplier_product_map",
        ),
    )
