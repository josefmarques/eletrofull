from sqlmodel import SQLModel, Field
from datetime import datetime
from uuid import UUID, uuid4
from typing import Optional

from app.core.timezone import br_now_naive


class Branch(SQLModel, table=True):
    """Modelo da tabela 'branches' - Filiais/Lojas."""
    __tablename__ = "branches"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(nullable=False)
    address: Optional[str] = Field(default=None)
    deleted_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=br_now_naive, nullable=False)
    updated_at: datetime = Field(default_factory=br_now_naive, nullable=False)
