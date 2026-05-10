from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from uuid import UUID

from app.core.database import get_session
from app.models.branches import Branch
from app.api.dependencies import get_current_user, require_admin
from app.models.users import User

router = APIRouter(tags=["branches"])


# ─── Schemas ─────────────────────────────────────────────────────────────────


class BranchCreate(BaseModel):
    name: str
    address: Optional[str] = None


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _branch_to_dict(branch: Branch) -> dict:
    return {
        "id": str(branch.id),
        "name": branch.name,
        "address": branch.address,
        "createdAt": branch.created_at.isoformat() if branch.created_at else None,
        "updatedAt": branch.updated_at.isoformat() if branch.updated_at else None,
    }


# ─── Endpoints ───────────────────────────────────────────────────────────────


@router.get("/branches")
def list_branches(
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Lista todas as filiais (exceto deletadas)."""
    statement = select(Branch).where(Branch.deleted_at.is_(None)).order_by(Branch.name)
    branches = session.exec(statement).all()
    return {"error": None, "data": [_branch_to_dict(b) for b in branches]}


@router.get("/branches/{branch_id}")
def get_branch(
    branch_id: UUID,
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Retorna uma filial pelo ID."""
    branch = session.get(Branch, branch_id)
    if not branch or branch.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Filial não encontrada",
        )
    return {"error": None, "data": _branch_to_dict(branch)}


@router.post("/branches", status_code=status.HTTP_201_CREATED)
def create_branch(
    body: BranchCreate,
    session: Session = Depends(get_session),
    _current_user: User = Depends(require_admin),
):
    """
    Cria uma nova filial.
    Acesso restrito a administradores.
    """
    # Validação: nome duplicado entre filiais ativas
    existing = session.exec(
        select(Branch).where(
            Branch.name == body.name,
            Branch.deleted_at.is_(None),
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe uma filial com o nome '{body.name}'.",
        )

    branch = Branch(
        name=body.name,
        address=body.address,
    )
    session.add(branch)
    session.commit()
    session.refresh(branch)

    return {"error": None, "data": _branch_to_dict(branch)}


@router.put("/branches/{branch_id}")
def update_branch(
    branch_id: UUID,
    body: BranchUpdate,
    session: Session = Depends(get_session),
    _current_user: User = Depends(require_admin),
):
    """
    Atualiza os dados de uma filial.
    Acesso restrito a administradores.
    """
    branch = session.get(Branch, branch_id)
    if not branch or branch.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Filial não encontrada",
        )

    # Atualiza apenas campos enviados
    if body.name is not None:
        # Verifica duplicidade (excluindo a própria filial)
        existing = session.exec(
            select(Branch).where(
                Branch.name == body.name,
                Branch.id != branch_id,
                Branch.deleted_at.is_(None),
            )
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Já existe outra filial com o nome '{body.name}'.",
            )
        branch.name = body.name

    if body.address is not None:
        branch.address = body.address

    branch.updated_at = datetime.now()
    session.add(branch)
    session.commit()
    session.refresh(branch)

    return {"error": None, "data": _branch_to_dict(branch)}
