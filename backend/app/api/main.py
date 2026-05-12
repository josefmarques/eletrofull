from fastapi import APIRouter
from app.api.routers.auth import router as auth_router
from app.api.routers.categories import router as categories_router
from app.api.routers.products import router as products_router
from app.api.routers.branches import router as branches_router
from app.api.routers.moves import router as moves_router
from app.api.routers.sales import router as sales_router
from app.api.routers.dashboard import router as dashboard_router
from app.api.routers.users import router as users_router
from app.api.routers.customers import router as customers_router
from app.api.routers.cash_sessions import router as cash_sessions_router
from app.api.routers.audit import router as audit_router
from app.api.routers.quotes import router as quotes_router

# Router principal que agrupa todos os endpoints.
# ATENÇÃO: As rotas são montadas SEM o prefixo /api porque:
#   1. O Nginx já faz o striping do /api antes de encaminhar para o backend
#   2. O frontend em server-side (Next.js) chama o backend diretamente sem /api
# Exemplo: /api/auth/login (frontend) → Nginx → /auth/login (backend)
api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(categories_router)
api_router.include_router(products_router)
api_router.include_router(branches_router)
api_router.include_router(moves_router)
api_router.include_router(sales_router)
api_router.include_router(dashboard_router)
api_router.include_router(users_router)
api_router.include_router(customers_router)
api_router.include_router(cash_sessions_router)
api_router.include_router(audit_router)
api_router.include_router(quotes_router)
