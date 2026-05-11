"""
Utilitário de Fuso Horário — America/Sao_Paulo (BRT/BRST).

Todas as datas da aplicação DEVEM ser geradas por esta função
para garantir consistência no fuso horário brasileiro.

O fuso é determinado pela variável de ambiente TZ, que DEVE ser
configurada como 'America/Sao_Paulo' no Dockerfile, docker-compose
e no início do main.py via os.environ['TZ'].
"""
import os
from datetime import datetime, timezone
from typing import Optional


def _get_tz_string() -> str:
    """Retorna o fuso horário da variável de ambiente TZ, ou o padrão BR."""
    return os.environ.get("TZ", "America/Sao_Paulo")


def _load_timezone():
    """Carrega o timezone a partir da TZ env var."""
    global _tz, _pytz_available
    tz_name = _get_tz_string()
    try:
        import pytz

        _tz = pytz.timezone(tz_name)
        _pytz_available = True
    except ImportError:
        _pytz_available = False
        _tz = timezone.utc


_tz = timezone.utc
_pytz_available = False
_load_timezone()


def reload_timezone():
    """Recarrega o timezone (útil se TZ mudou após importação)."""
    _load_timezone()


def now_br() -> datetime:
    """Retorna o datetime AGORA no fuso horário configurado (America/Sao_Paulo).

    - Se pytz estiver instalado: retorna um datetime *aware*
      (com timezone info), em BR.
    - Se pytz não estiver disponível (fallback): retorna
      datetime.now(timezone.utc) como fallback seguro.

    Uso:
        from app.core.timezone import now_br
        ...
        obj.created_at = now_br()
    """
    if _pytz_available:
        return datetime.now(_tz)
    return datetime.now(timezone.utc)


def br_now_naive() -> datetime:
    """Retorna datetime agora em BR, porém *naive* (sem tzinfo).

    Útil para compatibilidade com colunas TIMESTAMP WITHOUT TIME ZONE
    no PostgreSQL, que é o padrão do SQLModel/SQLAlchemy.

    Uso:
        from app.core.timezone import br_now_naive
        ...
        created_at: datetime = Field(default_factory=br_now_naive)
    """
    if _pytz_available:
        return datetime.now(_tz).replace(tzinfo=None)
    return datetime.now()
