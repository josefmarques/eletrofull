import os
import time

# ════════════════════════════════════════════════════════════════════════════
# FORÇA FUSO HORÁRIO BRASIL (America/Sao_Paulo)
# ════════════════════════════════════════════════════════════════════════════
# Isso DEVE vir ANTES de qualquer import que use datetime.now() ou pytz,
# pois o Python usa a env var TZ para determinar o fuso local.
# O pytz NÃO depende de TZ (usa banco Olson diretamente), mas o
# timezone.py já foi refatorado para ser dinâmico.
os.environ['TZ'] = 'America/Sao_Paulo'
time.tzset()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, text
from app.core.database import engine, settings, init_db
from app.core.seed import run_seed
from app.api.main import api_router

# Garante que o timezone seja recarregado com o TZ correto
from app.core.timezone import reload_timezone
reload_timezone()

app = FastAPI(
    title="Eletrosil API",
    description="Backend Python/FastAPI do Sistema Eletrosil",
    version="1.0.0",
)

# ════════════════════════════════════════════════════════════════════════════
# CORS — Multi-Tenant
# ════════════════════════════════════════════════════════════════════════════
# Permite requisições de ambos os domínios e do localhost para dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://eletrosil.top",
        "https://www.eletrosil.top",
        "https://eletromarques.top",
        "https://www.eletromarques.top",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra todas as rotas da API
app.include_router(api_router)


@app.on_event("startup")
def on_startup():
    """Inicializa conexão com o banco de dados, cria tabelas pendentes
    e executa o seed de dados se necessário."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"✅ Conectado ao banco de dados: {settings.database_url}")
        # Cria tabelas que ainda não existem no banco (ex: payments)
        init_db()
        # Povoamento inteligente (idempotente)
        run_seed()
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco: {e}")


@app.get("/")
@app.get("/api/health")
@app.get("/health")
def health_check():
    """Rota de health check do backend.
    
    Suporta:
    - GET /            (acesso direto ao backend)
    - GET /api/health  (via nginx com prefixo /api)
    - GET /health      (via nginx após rewrite do /api/health)
    """
    return {"status": "ok", "linguagem": "python"}


@app.get("/ping")
def ping():
    """Rota de ping usada pelo frontend antigo."""
    return {"pong": True}
