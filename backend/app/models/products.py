from sqlmodel import SQLModel, Field
from sqlalchemy import Column, Enum as SAEnum
from datetime import datetime
from uuid import UUID, uuid4
from typing import Optional
from .enums import UnitType


class Product(SQLModel, table=True):
    """Modelo da tabela 'products' - Produtos."""
    __tablename__ = "products"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(nullable=False)
    category_id: UUID = Field(nullable=False, foreign_key="categories.id")
    unit_price: int = Field(nullable=False)
    unit_type: UnitType = Field(
        default=UnitType.UN,
        sa_column=Column(
            SAEnum(
                UnitType,
                values_callable=lambda obj: [e.value for e in obj],
                create_type=False,
                nullable=False,
            )
        ),
    )
    deleted_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.now, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.now, nullable=False)
