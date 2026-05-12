from sqlmodel import SQLModel, Field
from datetime import datetime
from uuid import UUID, uuid4
from typing import Optional
from pydantic import model_validator

from app.core.timezone import br_now_naive


class User(SQLModel, table=True):
    """Modelo da tabela 'users' - Usuários do sistema."""
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    branch_id: Optional[UUID] = Field(default=None, foreign_key="branches.id")
    name: str = Field(nullable=False)
    email: str = Field(nullable=False, unique=True)
    password: str = Field(nullable=False)
    avatar: Optional[str] = Field(default=None)
    is_admin: bool = Field(default=False, nullable=False)
    role: str = Field(default="operator", nullable=False)
    token: Optional[str] = Field(default=None)
    commission_rate: float = Field(default=0.0, nullable=False)  # % de comissão do vendedor (ex: 5.0 = 5%)
    deleted_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=br_now_naive, nullable=False)
    updated_at: datetime = Field(default_factory=br_now_naive, nullable=False)

    @model_validator(mode='before')
    @classmethod
    def sync_role_and_admin(cls, data):
        """
        Mantém is_admin e role sincronizados para retrocompatibilidade.

        - Se apenas `role` for informado, `is_admin` é derivado.
        - Se apenas `is_admin` for informado, `role` é derivado.
        - Se ambos forem informados, `role` tem precedência (source of truth).
        """
        if isinstance(data, dict):
            role_provided = 'role' in data
            admin_provided = 'is_admin' in data

            if role_provided and not admin_provided:
                data['is_admin'] = data['role'] == 'admin'
            elif admin_provided and not role_provided:
                data['role'] = 'admin' if data['is_admin'] else 'operator'
            # Se ambos foram informados, confia no `role` e corrige `is_admin`
            elif role_provided and admin_provided:
                data['is_admin'] = data['role'] == 'admin'

        return data

