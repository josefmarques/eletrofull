from sqlmodel import SQLModel, Field
from datetime import datetime
from uuid import UUID, uuid4
from typing import Optional

from app.core.timezone import br_now_naive


class Customer(SQLModel, table=True):
    """Modelo da tabela 'customers' - Clientes."""
    __tablename__ = "customers"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(nullable=False)
    cpf_cnpj: Optional[str] = Field(default=None, unique=True)
    email: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    points: Optional[int] = Field(default=0)
    created_at: Optional[datetime] = Field(default_factory=br_now_naive)
    updated_at: Optional[datetime] = Field(default_factory=br_now_naive)
    deleted_at: Optional[datetime] = Field(default=None)
