from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
import jwt
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from app.core.database import get_session, settings as app_settings
from app.models.users import User

# Esquema de autenticação via Bearer Token
security = HTTPBearer(auto_error=False)


# Tenta obter o secret do JWT das configurações/ambiente
def get_jwt_secret() -> str:
    """Retorna a chave secreta para assinar JWT."""
    return app_settings.jwt_secret


def create_access_token(user: User) -> str:
    """Gera um token JWT para o usuário."""
    secret = get_jwt_secret()
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "name": user.name,
        "is_admin": user.is_admin,
        "role": user.role,
        "branch_id": str(user.branch_id) if user.branch_id else None,
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    """Decodifica e valida um token JWT."""
    secret = get_jwt_secret()
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: Session = Depends(get_session),
) -> User:
    """Extrai o usuário autenticado a partir do token JWT."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação não fornecido",
        )

    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: usuário não identificado",
        )

    user = session.get(User, user_id)
    if not user or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado ou desativado",
        )

    return user


# ═══════════════════════════════════════════════════════════════════════════════
# RBAC — Role-Based Access Control
# ═══════════════════════════════════════════════════════════════════════════════


class RoleChecker:
    """
    Dependência injetável para verificação de papéis (RBAC).

    Uso:
        @router.get("/rota-protegida")
        def endpoint(current_user: User = Depends(require_admin)):
            ...

        @router.get("/outra-rota")
        def endpoint(current_user: User = Depends(RoleChecker(["admin", "manager"]))):
            ...
    """

    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    async def __call__(
        self, current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Permissão insuficiente. Função requerida: "
                    f"{' ou '.join(self.allowed_roles)}. "
                    f"Sua função: '{current_user.role}'."
                ),
            )
        return current_user


# ── Dependências pré-configuradas para uso direto ───────────────────────────

#: Admin Global — acesso irrestrito a tudo
require_admin = RoleChecker(["admin"])

#: Manager — gerente de loja (NÃO inclui operator)
require_manager = RoleChecker(["admin", "manager"])

#: Operator — operador de caixa (PDV)
require_operator = RoleChecker(["admin", "manager", "operator"])


# ═══════════════════════════════════════════════════════════════════════════════
# Isolamento Multi-Filial
# ═══════════════════════════════════════════════════════════════════════════════


def verify_branch_access(current_user: User, requested_branch_id: Optional[UUID] = None) -> None:
    """
    Verifica se o usuário tem permissão para acessar dados da filial informada.

    Regras:
    - **Admin** (`role == "admin"`): acesso irrestrito a qualquer filial.
    - **Manager/Operator** (`role != "admin"`): só pode acessar a própria filial
      (`current_user.branch_id`). Se `requested_branch_id` for diferente,
      levanta HTTP 403.
    - Se `requested_branch_id` for `None`, o acesso é permitido (a query
      será naturalmente escopada ao `branch_id` do usuário).

    Raises:
        HTTPException(403): se o acesso à filial for negado.
    """
    if current_user.role == "admin":
        return  # Admin tem passe livre

    if requested_branch_id is not None:
        user_branch = str(current_user.branch_id) if current_user.branch_id else None
        req_branch = str(requested_branch_id)

        if user_branch != req_branch:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Acesso negado a esta filial. "
                    f"Você ({current_user.role}) está vinculado à filial "
                    f"'{user_branch}' e tentou acessar dados da filial '{req_branch}'."
                ),
            )
