from uuid import UUID
from typing import Optional
from sqlmodel import Session

from app.models.audit import AuditLog, AuditAction


def log_audit(
    session: Session,
    user_id: UUID,
    action: AuditAction,
    entity_name: str,
    entity_id: str,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
) -> AuditLog:
    """
    Registra uma entrada no log de auditoria.

    Esta função **não** realiza commit — o commit é feito pela transação
    principal da rota que a invoca, garantindo atomicidade.

    Retorna a instância de `AuditLog` criada.
    """
    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_name=entity_name,
        entity_id=entity_id,
        old_values=old_values,
        new_values=new_values,
    )
    session.add(audit_entry)
    return audit_entry
