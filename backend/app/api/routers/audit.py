from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, func
from uuid import UUID
from typing import Optional
from datetime import datetime

from app.core.database import get_session
from app.models.audit import AuditLog, AuditAction
from app.models.users import User
from app.api.dependencies import require_admin

router = APIRouter(tags=["audit"])


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _build_audit_response(row) -> dict:
    """
    Constrói o dicionário de resposta para um registro de auditoria.

    O parâmetro `row` é uma tupla (AuditLog, User) resultante do JOIN.
    """
    audit_log: AuditLog = row[0]
    user: User = row[1]

    return {
        "id": str(audit_log.id),
        "userId": str(audit_log.user_id),
        "userName": user.name,
        "action": audit_log.action.value if hasattr(audit_log.action, "value") else str(audit_log.action),
        "entityName": audit_log.entity_name,
        "entityId": audit_log.entity_id,
        "oldValues": audit_log.old_values,
        "newValues": audit_log.new_values,
        "createdAt": audit_log.created_at.isoformat() if audit_log.created_at else None,
    }


# ─── Endpoints ───────────────────────────────────────────────────────────────


@router.get("/audit-logs")
def list_audit_logs(
    user_id: Optional[UUID] = Query(None, alias="userId"),
    entity_name: Optional[str] = Query(None, alias="entityName"),
    action: Optional[AuditAction] = Query(None),
    start_date: Optional[datetime] = Query(None, alias="startDate"),
    end_date: Optional[datetime] = Query(None, alias="endDate"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    """
    Lista registros do log de auditoria.

    Acesso RESTRITO a usuários com role 'admin' (via require_admin).
    Suporta filtros opcionais por userId, entityName, action, startDate, endDate,
    além de paginação via limit/offset.
    """

    # ── Montagem da Query com JOIN ──
    query = (
        select(AuditLog, User)
        .join(User, AuditLog.user_id == User.id)
        .where(User.deleted_at.is_(None))
    )

    # ── Filtros opcionais ──
    if user_id is not None:
        query = query.where(AuditLog.user_id == user_id)

    if entity_name is not None:
        query = query.where(AuditLog.entity_name == entity_name)

    if action is not None:
        query = query.where(AuditLog.action == action)

    if start_date is not None:
        query = query.where(AuditLog.created_at >= start_date)

    if end_date is not None:
        query = query.where(AuditLog.created_at <= end_date)

    # ── Ordenação e Paginação ──
    total_query = select(func.count(AuditLog.id))
    # Reaplica os filtros no total (para manter consistência)
    if user_id is not None:
        total_query = total_query.where(AuditLog.user_id == user_id)
    if entity_name is not None:
        total_query = total_query.where(AuditLog.entity_name == entity_name)
    if action is not None:
        total_query = total_query.where(AuditLog.action == action)
    if start_date is not None:
        total_query = total_query.where(AuditLog.created_at >= start_date)
    if end_date is not None:
        total_query = total_query.where(AuditLog.created_at <= end_date)

    total = session.exec(total_query).first() or 0

    query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)

    rows = session.exec(query).all()

    return {
        "error": None,
        "data": [_build_audit_response(row) for row in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }
