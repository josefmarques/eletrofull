from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel
from app.core.database import get_session
from app.models.users import User
from app.api.dependencies import create_access_token, get_current_user
import bcrypt

router = APIRouter(tags=["auth"])


# ─── Schemas de requisição/resposta ─────────────────────────────────────────


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    token: str
    avatar: str | None = None
    isAdmin: bool = False
    role: str = "operator"
    commissionRate: float = 0.0
    branchId: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None


class ErrorResponse(BaseModel):
    error: str | None = None
    data: dict | None = None


# ─── Utilitário ──────────────────────────────────────────────────────────────


def _build_user_response(user: User, token: str) -> dict:
    """Monta o dicionário de resposta no formato que o frontend espera."""
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "token": token,
        "avatar": user.avatar,
        "isAdmin": user.is_admin,
        "role": user.role,
        "commissionRate": user.commission_rate,
        "branchId": str(user.branch_id) if user.branch_id else None,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
        "updatedAt": user.updated_at.isoformat() if user.updated_at else None,
    }


# ─── Endpoints ───────────────────────────────────────────────────────────────


@router.post("/auth/login")
def login(body: LoginRequest, session: Session = Depends(get_session)):
    """Autentica o usuário e retorna um token JWT."""
    # Busca usuário por email
    statement = select(User).where(User.email == body.email)
    user = session.exec(statement).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )

    # Verifica se o usuário foi deletado (soft delete)
    if user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário desativado",
        )

    # Verifica a senha com bcrypt
    password_bytes = body.password.encode("utf-8")
    hashed_bytes = user.password.encode("utf-8")

    if not bcrypt.checkpw(password_bytes, hashed_bytes):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )

    # Gera o token JWT
    token = create_access_token(user)

    # (Opcional) salva o token no banco (para logout/poder invalidar)
    user.token = token
    session.add(user)
    session.commit()

    return {
        "error": None,
        "data": _build_user_response(user, token),
    }


@router.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Retorna os dados do usuário autenticado."""
    return {
        "error": None,
        "data": {
            "id": str(current_user.id),
            "name": current_user.name,
            "email": current_user.email,
            "avatar": current_user.avatar,
            "isAdmin": current_user.is_admin,
            "role": current_user.role,
            "commissionRate": current_user.commission_rate,
            "branchId": str(current_user.branch_id) if current_user.branch_id else None,
            "createdAt": current_user.created_at.isoformat() if current_user.created_at else None,
            "updatedAt": current_user.updated_at.isoformat() if current_user.updated_at else None,
        },
    }


@router.post("/auth/logout")
def logout(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Invalida o token do usuário (logout)."""
    current_user.token = None
    session.add(current_user)
    session.commit()

    return {
        "error": None,
        "data": {"message": "Logged out successfully"},
    }
