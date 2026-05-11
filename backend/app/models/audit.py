from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON
from sqlalchemy import Enum as SAEnum
from datetime import datetime
from uuid import UUID, uuid4
from typing import Optional
from enum import Enum

from app.core.timezone import br_now_naive


class AuditAction(str, Enum):
    """Ações possíveis registradas na auditoria."""
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"


class AuditLog(SQLModel, table=True):
    """Modelo da tabela 'audit_logs' - Histórico imutável de ações críticas dos usuários."""
    __tablename__ = "audit_logs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(nullable=False, foreign_key="users.id", index=True)
    action: AuditAction = Field(
        sa_column=Column(
            SAEnum(
                AuditAction,
                values_callable=lambda obj: [e.value for e in obj],
                create_type=False,
                nullable=False,
            )
        ),
    )
    entity_name: str = Field(nullable=False, index=True)  # ex: 'Product', 'Stock', 'User'
    entity_id: str = Field(nullable=False, index=True)     # UUID do registro afetado (como string)
    old_values: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )
    new_values: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )
    created_at: datetime = Field(default_factory=br_now_naive, nullable=False)
