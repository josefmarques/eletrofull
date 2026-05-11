# =============================================================================
# seed.py
# Povoamento inteligente do banco de dados — executado no startup da API.
#
# Lê a variável de ambiente COMPANY_NAME para decidir qual conjunto de
# dados semear. As tabelas de branches e users são verificadas primeiro;
# se já houver registros, o seed é ignorado (idempotente).
# =============================================================================

import os
import bcrypt
from sqlmodel import Session, select
from app.core.database import engine
from app.models.branches import Branch
from app.models.users import User
from app.models.categories import Category
from app.models.products import Product
from app.models.enums import UnitType


# ─── Utilitários ─────────────────────────────────────────────────────────────

def _hash_password(password: str) -> str:
    """Gera o hash bcrypt de uma senha."""
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")


def _is_empty(session: Session, model) -> bool:
    """Retorna True se a tabela do modelo estiver vazia."""
    return session.exec(select(model).limit(1)).first() is None


def _build_category_map(session: Session, names: list[str]) -> dict[str, Category]:
    """Cria categorias a partir de uma lista de nomes e retorna
    um dicionário {nome_curto: obj} para referência rápida.

    Como a tabela 'categories' é plana (sem parent_id), os nomes
    são armazenados no formato 'Departamento — Subcategoria'.
    O dicionário indexa pela subcategoria (ex: 'Fios e Cabos')
    para facilitar o match com os produtos.
    """
    objs = [Category(name=n) for n in names]
    session.add_all(objs)
    session.flush()

    lookup = {}
    for obj in objs:
        parts = obj.name.split(" — ", 1)
        short = parts[1] if len(parts) == 2 else parts[0]
        lookup[short] = obj

    return lookup


# ═══════════════════════════════════════════════════════════════════════════════
# CATEGORIAS
# ═══════════════════════════════════════════════════════════════════════════════

CATEGORY_TREE = [
    # ── 1. ELÉTRICA ──
    "Elétrica — Fios e Cabos",
    "Elétrica — Tomadas e Interruptores",
    "Elétrica — Iluminação",
    "Elétrica — Disjuntores e Proteção",
    "Elétrica — Eletrodutos e Canaletas",
    "Elétrica — Quadros e Caixas",
    "Elétrica — Conectores e Terminais",
    "Elétrica — Ventilação",
    # ── 2. HIDRÁULICA ──
    "Hidráulica — Tubos e Conexões",
    "Hidráulica — Registros e Válvulas",
    "Hidráulica — Torneiras e Metais",
    "Hidráulica — Bombas e Pressurização",
    "Hidráulica — Caixas d'Água",
    "Hidráulica — Irrigação e Mangueiras",
    "Hidráulica — Esgoto e Drenagem",
    # ── 3. FERRAMENTAS ──
    "Ferramentas — Manuais",
    "Ferramentas — Elétricas",
    "Ferramentas — Medição",
    "Ferramentas — Construção",
    "Ferramentas — Solda",
    # ── 4. FIXAÇÃO E FERRAGENS ──
    "Fixação — Parafusos",
    "Fixação — Buchas",
    "Fixação — Porcas e Arruelas",
    "Fixação — Pregos",
    "Fixação — Correntes",
    "Fixação — Cadeados",
    "Fixação — Fechaduras",
    "Fixação — Dobradiças",
    # ── 5. EPI E SEGURANÇA ──
    "EPI — Luvas",
    "EPI — Óculos",
    "EPI — Capacetes",
    "EPI — Botinas",
    "EPI — Máscaras",
    "EPI — Protetores Auriculares",
    # ── 6. UTILIDADES E ACESSÓRIOS ──
    "Utilidades — Pilhas e Baterias",
    "Utilidades — Fitas Isolantes",
    "Utilidades — Abraçadeiras",
    "Utilidades — Extensões",
    "Utilidades — Adaptadores",
    "Utilidades — Organização",
]

# ═══════════════════════════════════════════════════════════════════════════════
# PRODUTOS DE TESTE
# ═══════════════════════════════════════════════════════════════════════════════

TEST_PRODUCTS = [
    {
        "name": "Cabo Flexível 1.5mm 100m",
        "category_key": "Fios e Cabos",
        "unit_price": 8990,         # R$ 89,90
        "unit_type": UnitType.RL,   # rolo
    },
    {
        "name": "Lâmpada LED Bulbo 9W",
        "category_key": "Iluminação",
        "unit_price": 1250,         # R$ 12,50
        "unit_type": UnitType.UN,   # unidade
    },
    {
        "name": "Tubo Soldável PVC 25mm",
        "category_key": "Tubos e Conexões",
        "unit_price": 475,          # R$ 4,75 (por metro)
        "unit_type": UnitType.M,    # metro
    },
    {
        "name": "Jogo de Chaves Combinadas",
        "category_key": "Manuais",
        "unit_price": 5990,         # R$ 59,90
        "unit_type": UnitType.CJ,   # conjunto
    },
    {
        "name": "Luva de Segurança",
        "category_key": "Luvas",
        "unit_price": 890,          # R$ 8,90
        "unit_type": UnitType.PAR,  # par
    },
]


# ═══════════════════════════════════════════════════════════════════════════════
# FUNÇÕES DE SEMEADURA
# ═══════════════════════════════════════════════════════════════════════════════

def _seed_categories(session: Session) -> dict[str, Category]:
    """Cria a árvore de categorias se a tabela estiver vazia."""
    if not _is_empty(session, Category):
        print("[seed]   ⏭️  Categorias já existem — ignorado.")
        return {}

    print("[seed]   🏷️  Criando categorias...")
    cat_map = _build_category_map(session, CATEGORY_TREE)
    print(f"[seed]   ✅ {len(cat_map)} categoria(s) criada(s)")
    return cat_map


def _seed_products(session: Session, cat_map: dict[str, Category]):
    """Cria os produtos de teste vinculados às categorias."""
    if not cat_map:
        print("[seed]   ⏭️  Produtos ignorados (sem categorias para vincular).")
        return

    if not _is_empty(session, Product):
        print("[seed]   ⏭️  Produtos já existem — ignorado.")
        return

    print("[seed]   📦 Criando produtos de teste...")
    products = []
    for p_def in TEST_PRODUCTS:
        category = cat_map.get(p_def["category_key"])
        if not category:
            print(f"[seed]   ⚠️  Categoria '{p_def['category_key']}' não encontrada — produto '{p_def['name']}' ignorado.")
            continue
        products.append(
            Product(
                name=p_def["name"],
                category_id=category.id,
                unit_price=p_def["unit_price"],
                unit_type=p_def["unit_type"],
            )
        )

    if products:
        session.add_all(products)
        session.flush()
        print(f"[seed]   ✅ {len(products)} produto(s) criado(s)")


def _seed_eletrosil(session: Session):
    """Popula dados do tenant Eletrosil."""
    print("[seed] 🌱 Populando dados do tenant Eletrosil...")

    branches_data = [
        Branch(name="Eletrosil - Antonio Pimenta"),
        Branch(name="Eletrosil - Centro"),
    ]
    session.add_all(branches_data)
    session.flush()
    print(f"[seed]   ✅ {len(branches_data)} unidade(s) criada(s)")

    admin = User(
        name="Admin Eletrosil",
        email="admin@eletrosil.top",
        password=_hash_password("mrq831028"),
        role="admin",
        is_admin=True,
        branch_id=branches_data[0].id,
    )
    session.add(admin)
    session.flush()
    print(f"[seed]   ✅ Admin criado: {admin.email} / mrq831028")

    cat_map = _seed_categories(session)
    _seed_products(session, cat_map)


def _seed_eletromarques(session: Session):
    """Popula dados do tenant Eletromarques."""
    print("[seed] 🌱 Populando dados do tenant Eletromarques...")

    branches_data = [
        Branch(name="Eletromarques - Centro"),
        Branch(name="Eletromarques - Maracanã"),
        Branch(name="Eletromarques - Major Prates"),
        Branch(name="Eletromarques - Galpão"),
    ]
    session.add_all(branches_data)
    session.flush()
    print(f"[seed]   ✅ {len(branches_data)} unidade(s) criada(s)")

    admin = User(
        name="Admin Eletromarques",
        email="admin@eletromarques.top",
        password=_hash_password("mrq831028"),
        role="admin",
        is_admin=True,
        branch_id=branches_data[0].id,
    )
    session.add(admin)
    session.flush()
    print(f"[seed]   ✅ Admin criado: {admin.email} / mrq831028")

    cat_map = _seed_categories(session)
    _seed_products(session, cat_map)


# ═══════════════════════════════════════════════════════════════════════════════
# ORQUESTRADOR
# ═══════════════════════════════════════════════════════════════════════════════

def run_seed():
    """Executa o povoamento inicial se as tabelas estiverem vazias."""
    company_name = os.environ.get("COMPANY_NAME", "").strip()

    if not company_name:
        print("[seed] ⏭️  COMPANY_NAME não definida — seed ignorado.")
        return

    with Session(engine) as session:
        try:
            if not _is_empty(session, Branch):
                print(f"[seed] ⏭️  Tabela 'branches' já contém registros — seed ignorado.")
                return

            if company_name == "Eletrosil":
                _seed_eletrosil(session)
            elif company_name == "Eletromarques":
                _seed_eletromarques(session)
            else:
                print(f"[seed] ⏭️  COMPANY_NAME=\"{company_name}\" não reconhecido — seed ignorado.")
                return

            session.commit()
            print("[seed] ✅ Seed concluído com sucesso!")

        except Exception as exc:
            session.rollback()
            print(f"[seed] ❌ Erro durante o seed: {exc}")
            raise
