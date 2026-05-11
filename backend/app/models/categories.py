from sqlmodel import SQLModel, Field
from datetime import datetime
from uuid import UUID, uuid4
from typing import Optional

from app.core.timezone import br_now_naive


class Category(SQLModel, table=True):
    """Modelo da tabela 'categories' - Categorias de produtos."""
    __tablename__ = "categories"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(nullable=False)
    deleted_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=br_now_naive, nullable=False)
    updated_at: datetime = Field(default_factory=br_now_naive, nullable=False)
