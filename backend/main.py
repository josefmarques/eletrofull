from fastapi import FastAPI
from sqlmodel import SQLModel, text
from app.core.database import engine, settings, init_db
from app.api.main import api_router

app = FastAPI(
    title="Eletrosil API",
    description="Backend Python/FastAPI do Sistema Eletrosil",
    version="1.0.0",
)

# Registra todas as rotas da API
app.include_router(api_router)


@app.on_event("startup")
def on_startup():
    """Inicializa conexão com o banco de dados e cria tabelas pendentes."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"✅ Conectado ao banco de dados: {settings.database_url}")
        # Cria tabelas que ainda não existem no banco (ex: payments)
        init_db()
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
