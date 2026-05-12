from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlmodel import Session, select
from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional, Literal
from datetime import datetime
import bcrypt
import shutil
import os
from sqlalchemy.exc import IntegrityError

from app.core.database import get_session
from app.models.branches import Branch
from app.models.users import User
from app.api.dependencies import get_current_user, require_admin

router = APIRouter(tags=["users"])


# ─── Utilitário ──────────────────────────────────────────────────────────────


def _parse_branch_id(raw: Optional[str]) -> Optional[UUID]:
    """Converte string vazia ou None para None, senão converte para UUID."""
    if not raw:  # None, "", "   " → None
        return None
    return UUID(raw)


# ─── Schemas ─────────────────────────────────────────────────────────────────


_VALID_ROLES = Literal["admin", "manager", "operator", "vendedor"]


class UserCreate(BaseModel):
    """Schema para criação de usuário (JSON)."""
    name: str
    email: str
    password: str
    role: _VALID_ROLES = "operator"
    branchId: Optional[str] = None  # UUID string, opcional
    commissionRate: Optional[float] = 0.0  # Taxa de comissão do vendedor


class UserUpdate(BaseModel):
    """Schema para atualização de usuário (JSON).
    
    O password é opcional na edição.
    """
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[_VALID_ROLES] = None
    branchId: Optional[str] = None  # UUID string, opcional
    commissionRate: Optional[float] = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    avatar: Optional[str] = None
    isAdmin: bool = False
    isActive: bool = True
    role: str = "operator"
    branchId: Optional[str] = None
    branchName: Optional[str] = None
    commissionRate: float = 0.0
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────


AVATAR_DIR = "public/avatars"
os.makedirs(AVATAR_DIR, exist_ok=True)


ROLE_LABELS = {
    "admin": "Admin Global",
    "manager": "Gerente de Loja",
    "operator": "Operador de Caixa",
    "vendedor": "Vendedor de Balcão",
}


def _build_user_response(user: User, branch_name_map: dict[str, str] | None = None) -> dict:
    """Monta o dicionário de resposta no formato que o frontend espera.
    
    Args:
        user: Instância do User.
        branch_name_map: dict {branch_id_str: branch_name} para resolver nomes.
    """
    branch_id_str = str(user.branch_id) if user.branch_id else None
    branch_name = None
    if branch_id_str and branch_name_map:
        branch_name = branch_name_map.get(branch_id_str)

    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "avatar": user.avatar,
        "isAdmin": user.is_admin,
        "isActive": user.deleted_at is None,
        "role": user.role,
        "branchId": branch_id_str,
        "branchName": branch_name,
        "commissionRate": user.commission_rate,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
        "updatedAt": user.updated_at.isoformat() if user.updated_at else None,
    }


def _save_avatar(upload: UploadFile, user_id: UUID) -> str:
    """Salva o arquivo de avatar e retorna o path relativo."""
    ext = os.path.splitext(upload.filename or "")[1] or ".jpg"
    filename = f"{user_id}{ext}"
    filepath = os.path.join(AVATAR_DIR, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(upload.file, buffer)

    return f"avatars/{filename}"


# ─── Endpoints ───────────────────────────────────────────────────────────────


@router.get("/users")
def list_users(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    include_inactive: bool = Query(False, alias="includeInactive"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Lista todos os usuários.
    
    Por padrão, lista apenas ATIVOS (deleted_at IS NULL).
    Se `include_inactive=true`, lista apenas INATIVOS (deleted_at IS NOT NULL).
    Inclui branchName via JOIN para exibição no frontend.
    """
    if include_inactive:
        statement = (
            select(User)
            .where(User.deleted_at.is_not(None))
            .order_by(User.deleted_at.desc())
            .offset(offset)
            .limit(limit)
        )
    else:
        statement = (
            select(User)
            .where(User.deleted_at.is_(None))
            .order_by(User.name)
            .offset(offset)
            .limit(limit)
        )
    users = session.exec(statement).all()

    # Resolve nomes das filiais em lote (1 query extra, não N+1)
    branch_ids = list({u.branch_id for u in users if u.branch_id})
    branch_name_map: dict[str, str] = {}
    if branch_ids:
        branches = session.exec(
            select(Branch).where(Branch.id.in_(branch_ids))
        ).all()
        branch_name_map = {str(b.id): b.name for b in branches}

    return {
        "error": None,
        "data": [_build_user_response(u, branch_name_map) for u in users],
    }


@router.get("/users/{user_id}")
def get_user(
    user_id: UUID,
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Retorna um usuário pelo ID."""
    user = session.get(User, user_id)
    if not user or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )

    # Resolve nome da filial
    branch_name_map = {}
    if user.branch_id:
        branch = session.get(Branch, user.branch_id)
        if branch:
            branch_name_map[str(user.branch_id)] = branch.name

    return {
        "error": None,
        "data": _build_user_response(user, branch_name_map),
    }


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    """
    Cria um novo usuário.
    Acesso restrito a administradores.
    """
    # Valida role
    if body.role not in ("admin", "manager", "operator", "vendedor"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role inválida: '{body.role}'. Use: admin, manager, operator ou vendedor.",
        )

    # Verifica se email já existe entre usuários ATIVOS
    existing = session.exec(
        select(User).where(User.email == body.email, User.deleted_at.is_(None))
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este e-mail já está em uso por outro usuário ativo.",
        )

    # Verifica se email pertence a um usuário INATIVO — sugere reativação
    inactive = session.exec(
        select(User).where(User.email == body.email, User.deleted_at.is_not(None))
    ).first()
    if inactive:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Este e-mail pertence ao usuário inativo '{inactive.name}'. Deseja reativá-lo?",
        )

    # Hash da senha
    hashed = bcrypt.hashpw(
        body.password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")

    # Resolve branch_id (aceita string vazia como None)
    branch_id = _parse_branch_id(body.branchId)

    user = User(
        name=body.name,
        email=body.email,
        password=hashed,
        role=body.role,
        branch_id=branch_id,
        commission_rate=body.commissionRate or 0.0,
    )
    session.add(user)

    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este e-mail já está em uso ou pertence a um usuário inativo.",
        )

    session.refresh(user)

    return {
        "error": None,
        "data": _build_user_response(user),
    }


@router.put("/users/{user_id}")
def update_user(
    user_id: UUID,
    name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    role: Optional[str] = Form(None),
    branchId: Optional[str] = Form(None),
    commissionRate: Optional[float] = Form(None),
    avatar: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    """
    Atualiza dados de um usuário.
    Aceita multipart/form-data (incluindo upload de avatar).
    Acesso restrito a administradores.
    """
    user = session.get(User, user_id)
    if not user or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )

    # Atualiza campos um a um
    if name is not None:
        user.name = name

    if email is not None:
        # Verifica se email já existe (excluindo o próprio)
        existing = session.exec(
            select(User).where(User.email == email, User.id != user_id)
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email já cadastrado por outro usuário",
            )
        user.email = email

    if password is not None and password.strip():
        hashed = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt(),
        ).decode("utf-8")
        user.password = hashed

    if role is not None:
        if role not in ("admin", "manager", "operator", "vendedor"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role inválida: '{role}'. Use: admin, manager, operator ou vendedor.",
            )
        user.role = role
        # Se for promovido a admin, limpa a filial (admin não tem filial fixa)
        if role == "admin":
            user.branch_id = None

    if branchId is not None:
        user.branch_id = _parse_branch_id(branchId)

    if commissionRate is not None:
        user.commission_rate = commissionRate

    if avatar is not None and avatar.filename and avatar.filename.strip():
        avatar_path = _save_avatar(avatar, user.id)
        user.avatar = avatar_path

    user.updated_at = datetime.now()
    session.add(user)
    session.commit()
    session.refresh(user)

    return {
        "error": None,
        "data": _build_user_response(user),
    }


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    """
    Desativa um usuário (soft delete).
    Acesso restrito a administradores.
    """
    user = session.get(User, user_id)
    if not user or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )

    user.deleted_at = datetime.now()
    session.add(user)
    session.commit()

    return None  # HTTP 204


@router.patch("/users/{user_id}/status")
def toggle_user_status(
    user_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    """
    Alterna o status de um usuário entre ativo e inativo (reativar/desativar).
    
    - Se ativo → soft delete (seta deleted_at)
    - Se inativo → reativa (limpa deleted_at)
    
    Ao reativar, verifica se o e-mail não entra em conflito com outro usuário ativo.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )

    is_currently_active = user.deleted_at is None

    if is_currently_active:
        # ── DESATIVAR ──
        user.deleted_at = datetime.now()
        action = "desativado"
    else:
        # ── REATIVAR: verifica conflito de e-mail ──
        email_conflict = session.exec(
            select(User).where(
                User.email == user.email,
                User.id != user_id,
                User.deleted_at.is_(None),
            )
        ).first()
        if email_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Não é possível reativar: o e-mail '{user.email}' já está em uso por outro usuário ativo ('{email_conflict.name}').",
            )
        user.deleted_at = None
        action = "reativado"

    user.updated_at = datetime.now()
    session.add(user)
    session.commit()
    session.refresh(user)

    return {
        "error": None,
        "message": f"Usuário '{user.name}' {action} com sucesso.",
        "data": _build_user_response(user),
    }
