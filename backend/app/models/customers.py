from sqlmodel import SQLModel, Field
from datetime import datetime
from uuid import UUID, uuid4
from typing import Optional


class Customer(SQLModel, table=True):
    """Modelo da tabela 'customers' - Clientes."""
    __tablename__ = "customers"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(nullable=False)
    cpf_cnpj: Optional[str] = Field(default=None, unique=True)
    email: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    points: Optional[int] = Field(default=0)
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)
    deleted_at: Optional[datetime] = Field(default=None)
