# 🏗️ Eletrosil — System Onboarding & Architecture Guide

> **Versão do documento:** 1.0  
> **Status:** ✅ Concluído — Pausa no desenvolvimento de novas features  
> **Propósito:** Guia definitivo para compreensão da plataforma de ponta a ponta

---

## Índice

1. [Visão Geral do Projeto e Arquitetura](#1-visão-geral-do-projeto-e-arquitetura)
2. [Dicionário de Módulos (Funcionalidades vs Técnica)](#2-dicionário-de-módulos-funcionalidades-vs-técnica)
3. [Motor Transacional e Integridade de Dados](#3-motor-transacional-e-integridade-de-dados)
4. [Estrutura de Diretórios e Componentes](#4-estrutura-de-diretórios-e-componentes)
5. [Glossário de Termos Técnicos](#5-glossário-de-termos-técnicos)

---

## 1. Visão Geral do Projeto e Arquitetura

### 1.1. Propósito do Eletrosil

O **Eletrosil** é um sistema web de **gestão empresarial para lojas de material elétrico e construção**. Ele nasceu para substituir planilhas e sistemas legados, oferecendo:

- **Gestão de estoque multi-filial** com rastreabilidade completa (Movements)
- **PDV (Frente de Caixa)** com pagamento rápido e split payment
- **Importação inteligente de XML de NFe** com aprendizado contínuo de mapeamento fornecedor → produto local
- **Dashboard BI** com indicadores financeiros, estoques críticos e produtos estagnados
- **Sessão de Caixa** (abertura/fechamento com conferência de valores)
- **Cadastro de produtos, clientes, categorias, usuários e filiais**
- **RBAC** com dois perfis: **Admin Global** (visão corporativa) e **Operador** (vinculado a uma filial)

### 1.2. Stack Tecnológica

| Camada | Tecnologia | Versão | Função |
|--------|-----------|--------|--------|
| **Banco de Dados** | PostgreSQL | 17+ | Dados relacionais, chaves UUID, tipos ENUM, Identity columns |
| **Backend** | Python 3.11 + FastAPI | FastAPI 0.115+ | API REST, autenticação, lógica de negócio |
| **ORM** | SQLModel (Pydantic + SQLAlchemy) | 0.0.20+ | Modelagem, validação na camada de entrada, queries |
| **Frontend** | Next.js 14+ (App Router) | React 18, TS 5 | Interface de usuário SPA/SSR |
| **UI Components** | shadcn/ui (Radix + Tailwind) | — | Componentes acessíveis e estilizados |
| **Autenticação** | JWT (HS256) via `PyJWT` | — | Tokens com expiração de 7 dias |
| **Senhas** | bcrypt | — | Hash seguro das senhas |
| **Containerização** | Docker + docker-compose | — | Ambiente isolado (backend, frontend, db) |
| **Gráficos** | Recharts | React | Dashboard BI |

### 1.3. Fluxo de Requisição (Request Lifecycle)

```
┌───────────┐        ┌───────────┐        ┌───────────┐        ┌────────────┐
│  Browser  │ ──HTTP─▶│  Next.js  │ ──API──▶│  FastAPI  │ ──SQL──▶│ PostgreSQL │
│  (React)  │◀────────│  (Proxy)  │◀────────│ (Python)  │◀────────│   (DB)     │
└───────────┘         └───────────┘         └───────────┘         └────────────┘
```

#### Etapas detalhadas:

1. **Navegador → Next.js (Server-Side):** A primeira carga da página é renderizada no servidor Next.js. As páginas do painel (`/pdv`, `/dashboard`, etc.) são dinâmicas (`"use client"`) e executam hidratação no cliente.

2. **Next.js → FastAPI (Client-Side):** Toda chamada a dados dinâmicos é feita via **axios** através do arquivo `frontend/proxy.ts`, que cria uma instância de API apontando para `http://backend:8000/api`. O token JWT é enviado no header `Authorization: Bearer <token>`.

3. **FastAPI → Middleware de Autenticação (JWT):** Toda rota protegida (exceto `/auth/login`) usa o dependency `get_current_user()`, que decodifica o JWT e retorna o objeto `User` autenticado.

4. **FastAPI → Pydantic/SQLModel (Validação):** O payload de entrada é validado por schemas Pydantic antes de qualquer lógica. Exemplo:

```python
class SaleCreate(BaseModel):
    branchId: Optional[UUID] = None
    customerId: Optional[UUID] = None
    grossValue: str | int | float     # Aceita string "1500.00" ou número
    totalValue: str | int | float
    discount: str | int | float = "0.00"
    payments: Optional[List[PaymentPayload]] = None
    items: List[SaleItemPayload]
```

5. **SQLModel → PostgreSQL:** As queries são construídas com `session.exec(select(...))` e usam **prepared statements**, prevenindo SQL injection. Toda escrita crítica usa transações atômicas.

6. **Resposta:** O FastAPI retorna um JSON padronizado:
```json
{
  "error": null,
  "data": { ... }
}
```

---

## 2. Dicionário de Módulos (Funcionalidades vs Técnica)

### 2.1. Autenticação e Perfis (RBAC)

#### 🧑‍💼 Para o usuário final

- **Login:** Informa e-mail e senha → recebe um token JWT que dura 7 dias.
- **Perfil Admin Global:** Acessa todas as filiais, pode criar/editar usuários, visualizar dashboards consolidados, e opera sem precisar de sessão de caixa aberta.
- **Perfil Operador:** Vinculado a UMA filial específica. Só vê dados da sua filial. Precisa abrir sessão de caixa para vender.

#### ⚙️ Implementação técnica

```
Rotas: backend/app/api/routers/auth.py
Tabelas: users
Dependência: backend/app/api/dependencies.py
```

**Login (`POST /auth/login`):**
```python
# 1. Busca User por email (SELECT * FROM users WHERE email = :email)
# 2. Verifica bcrypt.checkpw(password, user.password)
# 3. Gera JWT com payload:
#    { "sub": user.id, "email": ..., "name": ..., "is_admin": ..., "exp": 7d }
# 4. Salva token no banco (para poder invalidar no logout)
# 5. Retorna { error: null, data: { id, name, email, token, isAdmin, branchId } }
```

**Middleware de proteção (`get_current_user`):**
```python
async def get_current_user(credentials, session) -> User:
    # 1. Extrai token do header Authorization: Bearer <token>
    # 2. Decodifica JWT com jwt.decode(token, secret, algorithms=["HS256"])
    # 3. Verifica se user existe e não foi deletado (soft delete)
    # 4. Retorna o objeto User para o endpoint
```

**Como o frontend armazena e envia o token:**
- O login salva o token no `localStorage` e/ou cookie via `actions/auth.ts`
- Toda requisição axios (via `proxy.ts`) envia o token automaticamente através de um interceptor

---

### 2.2. Importação de XML (NFe)

#### 📄 Para o usuário final

1. O operador faz upload de um XML de Nota Fiscal Eletrônica (NFe)
2. O sistema faz o **parse automático**, extraindo: fornecedor, CNPJ, número da nota, itens (código, descrição, quantidade, valor unitário)
3. Para cada item, o sistema verifica se já existe um **mapeamento** entre o código do fornecedor e um produto local do estoque Eletrosil
4. Itens já mapeados aparecem com o nome do produto local. Itens não mapeados precisam de mapeamento manual.
5. Após confirmar os mapeamentos, o operador clica "Processar Entrada" e o estoque é atualizado atomicamente.

#### ⚙️ Implementação técnica

```
Módulo: backend/app/services/nfe_parser.py
Rotas: backend/app/api/routers/moves.py (seções "import-xml", "import/map-products", "import/process-entry")
Tabelas: moves, stocks, products, supplier_maps (supplier_product_maps)
```

**1. Parse do XML (`parse_nfe_xml`):**
```python
# Usa xml.etree.ElementTree com namespace SEFAZ
NAMESPACE = "http://www.portalfiscal.inf.br/nfe"
NS = {"nfe": NAMESPACE}

# Extrai:
cabecalho = {
    "fornecedor": "RAZAO SOCIAL LTDA",
    "cnpj": "16163057001385",
    "dataEmissao": "2025-05-08T10:00:00-03:00",
    "numeroNota": "123456",
    "serie": "1",
    "chaveAcesso": "35200516163057001385550010001234566789012345",
}

# Cada item do XML vira:
itens = [
    {
        "numeroItem": 1,
        "codigoFornecedor": "60490",     # Código que o fornecedor usa
        "descricao": "DISJUNTOR 40A",
        "quantidade": 10,
        "valorUnitario": 45.90,
        "unidadeOriginal": "UN",
        "unidadeMapeada": "un",           # Mapeado via unit_mapper.py
        "ean": "7891234567890",
    }
]
```

**2. Mapeamento inteligente (`supplier_product_maps`):**
```python
# Tabela: supplier_product_maps
# Colunas: id, supplier_cnpj, supplier_product_code, local_product_id, created_at

# Ao importar o XML, o backend consulta se já existem mapeamentos
# para aquele CNPJ. Se sim, enriquece os itens da NFe com
# localProductId e localProductName.

# O operador pode salvar novos mapeamentos via:
# POST /moves/import/map-products
# Usa UPSERT (INSERT ... ON CONFLICT DO UPDATE)
```

**3. Entrada no estoque (`POST /moves/import/process-entry`):**
```python
# Para cada item mapeado:
# A) Cria Move { type='in', product_id, branch_id, quantity, unit_price }
# B) Atualiza Stock: se existir, soma. Se não, cria.
# Tudo em UMA transação: session.commit() no final.
```

**4. Mapeador de Unidades (`unit_mapper.py`):**

Converte unidades da NFe (ex: "UN", "CX", "RL") para o enum padronizado do sistema (`UnitType`).

---

### 2.3. Logística Multi-Filial

#### 🏢 Para o usuário final

- O Admin Global vê todas as filiais em um select no topo da página.
- O Operador comum só opera na sua filial de vínculo.
- **Transferência entre filiais**: o usuário seleciona origem, destino, itens e quantidades. O sistema:
  - Verifica saldo na origem
  - **Subtrai** do estoque da origem
  - **Adiciona** ao estoque do destino
  - Registra **duas movimentações** (uma saída na origem, uma entrada no destino)

#### ⚙️ Implementação técnica

```
Rota: POST /moves/transfer (backend/app/api/routers/moves.py)
Tabelas: moves, stocks, branches
```

**Payload de transferência:**
```json
{
  "source_branch_id": "uuid-da-filial-a",
  "destination_branch_id": "uuid-da-filial-b",
  "items": [
    { "product_id": "uuid-produto", "quantity": 10 },
    { "product_id": "uuid-outro", "quantity": 5 }
  ]
}
```

**Lógica atômica (ACID):**
```python
# Para CADA item:
# 1. Verifica se Stock[origem].quantity >= quantity solicitada
# 2. Stock[origem].quantity -= quantity
# 3. Cria Move { type='out', branch=origem }
# 4. Stock[destino]: upsert (soma se existe, cria se não)
# 5. Cria Move { type='in', branch=destino }

# Se QUALQUER item falhar (ex: saldo insuficiente):
#   → session.rollback() → nada é alterado
# Se todos OK:
#   → session.commit() → tudo é persistido
```

---

### 2.4. Dashboard BI

#### 📊 Para o usuário final

- **Valor do Estoque:** Soma financeira de todos os produtos `(quantity × unit_price)`
- **Movimentações (Entradas/Saídas):** Totais por período com filtro por filial
- **Gráfico de Movimentações:** Recharts exibindo barras de entrada e saída por dia
- **Estoque Crítico:** Produtos com `quantity <= minimum_quantity` (precisam ser reabastecidos)
- **Produtos Estagnados:** Produtos com saldo > 0 que não tiveram NENHUMA movimentação nos últimos 30 dias (dinheiro parado na prateleira)

#### ⚙️ Implementação técnica

```
Rotas: backend/app/api/routers/dashboard.py
Tabelas: products, stocks, moves, categories, users
Frontend: frontend/app/(painel)/dashboard/page.tsx
Serviço: frontend/services/dashboard.ts
```

**Produtos Estagnados — Lógica no backend:**
```python
@router.get("/dashboard/stagnant-products")
def get_stagnant_products(...):
    # 1. Calcula dt_start (30 dias atrás) e dt_end (agora)
    # 2. Subquery: SELECT DISTINCT product_id FROM moves
    #    WHERE created_at BETWEEN dt_start AND dt_end
    # 3. Query principal: SELECT * FROM products
    #    JOIN stocks ON products.id = stocks.product_id
    #    WHERE stocks.quantity > 0
    #    AND products.id NOT IN (subquery)
    #    → Produtos com saldo > 0 mas SEM movimentos no período
```

**Motor de agregação financeira:**
```python
# /dashboard/inventory-value
SELECT SUM(stocks.quantity * products.unit_price) AS total_value
FROM stocks
JOIN products ON stocks.product_id = products.id
WHERE products.deleted_at IS NULL
  [AND stocks.branch_id = :branchId]  # Filtro opcional
```

**Gráfico por dia (`/dashboard/moves-graph`):**
```python
# Agrupa entradas e saídas por data (GROUP BY DATE)
# Preenche dias sem movimento com valor 0 para não quebrar o gráfico
result = [
    {"date": "2025-05-02", "in": 1500, "out": 300},
    {"date": "2025-05-03", "in": 0, "out": 1200},
    ...
]
```

**Frontend:** O componente React usa Recharts (`<BarChart>`, `<LineChart>`) com data do endpoint e hooks de filtro por período e filial.

---

### 2.5. PDV / Frente de Caixa

#### 🛒 Para o usuário final

O **PDV** é a tela mais crítica do sistema — otimizada para operação rápida:

1. **Busca gigante** no topo (56px de altura) — sempre auto-focada
2. Digite nome ou código do produto → resultados aparecem em dropdown
3. Use **setas ↑↓** para navegar, **Enter** para selecionar
4. Produto vai para o carrinho com quantidade 1
5. Ajuste quantidades com +/- ou digitação manual
6. **Botões grandes e coloridos** de método de pagamento:
   - 🟢 **Dinheiro** (cash) | 🔵 **PIX** | 🟣 **Crédito** | 🟠 **Débito**
7. Clique no botão → **pagamento único** + finalização automática
8. Ou use **split payment** (pagamento dividido) para misturar métodos
9. **Atalhos de teclado:** `F9` = Finalizar, `ESC` = Limpar carrinho
10. Tela de sucesso com valor total, troco (se dinheiro), e botão para imprimir cupom térmico

#### ⚙️ Implementação técnica

```
Rotas:
  - POST /sales (cria venda com payload completo — legado)
  - POST /sales/checkout (cria venda com payload PDV simplificado — atual)
  - GET /sales (listar vendas)
  - GET /sales/{id} (detalhe da venda)
Tabelas: sales, sale_items, payments, stocks, moves
Frontend: frontend/app/(painel)/pdv/page.tsx
Contexto: frontend/contexts/SaleContext.tsx
Serviço: frontend/services/sale.ts
```

**Payload do PDV Checkout (rota otimizada):**
```json
{
  "branch_id": "uuid-da-filial",
  "payment_method": "pix",
  "discount_amount": "0.00",
  "items": [
    {
      "product_id": "uuid-produto",
      "quantity": 2,
      "unit_price": 45.90
    }
  ]
}
```

**Lógica ACID da finalização (`pdv_checkout`):**

```
1. Valida itens (produto existe, não deletado)
2. Valida estoque (Stock.quantity >= solicitado para CADA item)
3. Calcula gross_value = Σ(quantity × unit_price)
4. Calcula total_value = gross_value - discount_amount
5. Mapeia payment_method string → enum PaymentMethod
6. Cria Sale (receipt_number gerado automaticamente via IDENTITY)
7. Para CADA item:
   a. Cria SaleItem (sale_id, product_id, quantity, unit_price, subtotal)
   b. Stock.quantity -= quantity (subtrai do estoque)
   c. Cria Move { type='out' } (rastreabilidade)
8. Cria Payment (sale_id, method, amount)
9. session.commit() → TUDO ou NADA
```

**Componentes principais do frontend PDV:**

| Componente | Função |
|-----------|--------|
| `productInputRef` | Refs para auto-foco no input de busca |
| `searchTerm` / `searchResults` | Busca com debounce 300ms |
| `selectedProductIndex` | Navegação por setas no dropdown |
| `quickPaymentMethod` | Método de pagamento selecionado (cash, pix, credit, debit) |
| `showSplitPanel` | Alterna entre pagamento único e split |
| `state.payments` (SaleContext) | Array de pagamentos adicionados (split) |
| `totalPaid`, `change` | Cálculo em tempo real |
| `handleFinalize` | Envia para `POST /sales/checkout` |

---

## 3. Motor Transacional e Integridade de Dados

### 3.1. Como o sistema garante ACID

O modelo **ACID** (Atomicity, Consistency, Isolation, Durability) é garantido pelo **SQLModel** (que encapsula o SQLAlchemy) sobre o PostgreSQL.

#### 🔄 Fluxo de uma transação crítica (ex: venda)

```python
# backend/app/api/routers/sales.py — pdv_checkout()

@router.post("/sales/checkout", status_code=status.HTTP_201_CREATED)
def pdv_checkout(body, session, current_user):
    # ── 1. VALIDAÇÕES PRÉVIAS (antes de qualquer escrita) ──
    # Tudo é verificado sem criar registros ainda

    for item in body.items:
        product = session.get(Product, item.product_id)   # leitura
        stock = session.exec(select(Stock).where(...)).first()  # leitura
        if qty > stock.quantity:
            raise HTTPException(400, "Estoque insuficiente")
            # → FASTAPI INTERROMPE AQUI, nenhum dado foi modificado

    # ── 2. OPERAÇÕES DE ESCRITA ──
    sale = Sale(...)          # Cria objeto Sale (ainda não no banco)
    session.add(sale)         # Marca para inserção
    session.flush()           # Força o INSERT para obter o ID

    for item in items:
        session.add(SaleItem(...))   # Marca SaleItem
        stock.quantity -= qty        # Modifica objeto Stock
        session.add(stock)           # Marca atualização
        session.add(Move(...))       # Marca Move (movimentação)

    session.add(Payment(...))        # Marca Payment

    # ── 3. COMMIT — TUDO OU NADA ──
    session.commit()
    # Se qualquer linha acima falhar (ex: constraint violation, disk full):
    # → session.commit() NUNCA é executado
    # → O with Session(engine) faz rollback automático ao sair
```

#### 🧪 O que pode causar rollback automático:

| Situação | Consequência |
|---------|-------------|
| Produto não encontrado → `raise HTTPException(404)` | Rollback — nada foi escrito |
| Estoque insuficiente → `raise HTTPException(400)` | Rollback — nada foi escrito |
| Falha na constraint do banco (ex: chave duplicada) | Rollback automático pelo SQLAlchemy |
| Exceção inesperada (ex: conexão com banco caiu) | Rollback automático |
| Dois usuários vendem o mesmo produto ao mesmo tempo | PostgreSQL lida via locks de linha |

#### 🔒 Concorrência (Dois PDVs vendendo o mesmo item)

O PostgreSQL usa **locking no nível de linha**. Quando `session.commit()` é chamado, o banco faz:

```
BEGIN;
  UPDATE stocks SET quantity = quantity - 2 WHERE id = 'x';
  -- Se outra transação já está tentando atualizar a mesma linha,
  -- esta espera (lock) até a primeira terminar.
  -- Se a primeira deu COMMIT, esta vê o valor atualizado.
  -- Se a primeira deu ROLLBACK, esta prossegue.
COMMIT;
```

Ou seja: **duas vendas simultâneas do mesmo produto nunca resultarão em estoque negativo**.

### 3.2. Pydantic + SQLModel: Dupla Camada de Proteção

O sistema usa **duas camadas de validação de dados**:

```
Requisição HTTP
     │
     ▼
┌─────────────────────────────┐
│  1. Pydantic Schema         │ ← Validação de TIPO e FORMATO
│     (Payload de entrada)    │   Ex: se espera UUID mas veio string "abc"
│                             │   → HTTP 422 (Unprocessable Entity)
└─────────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│  2. SQLModel Model          │ ← Validação de CONSTRAINTS
│     (Objeto de banco)       │   Ex: nullable=False, max_digits,
│                             │       foreign_key, unique
└─────────────────────────────┘
     │
     ▼
   PostgreSQL                 ← Validação no banco (última barreira)
```

#### Exemplo prático:

```python
# Schema Pydantic (entrada da API)
class PDVCheckoutItem(BaseModel):
    product_id: UUID          # Se vier "not-a-uuid", HTTP 422 automático
    quantity: int             # Se vier "abc", HTTP 422 automático
    unit_price: str | int | float  # Aceita string "45.90" ou número 45.9

# Model SQLModel (tabela no banco)
class SaleItem(SQLModel, table=True):
    __tablename__ = "sale_items"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    sale_id: UUID = Field(nullable=False, foreign_key="sales.id")  # FK
    product_id: UUID = Field(nullable=False, foreign_key="products.id")
    quantity: int = Field(nullable=False)  # Não pode ser NULL
    unit_price: Decimal = Field(max_digits=12, decimal_places=2)  # Precisão
    subtotal: Decimal = Field(max_digits=12, decimal_places=2)
```

**Proteção contra dados corrompidos:**

1. **Tipos flexíveis na entrada:** `str | int | float` permite que o frontend envie tanto `"1500.00"` quanto `1500.0` — o Python converte para `Decimal` no backend.
2. **Decimais com precisão fixa:** `max_digits=12, decimal_places=2` garante que valores financeiros nunca tenham erros de arredondamento.
3. **Foreign Keys:** O banco impede a criação de um `SaleItem` vinculado a um `sale_id` que não existe.
4. **Identity columns:** O `receipt_number` é gerado automaticamente pelo PostgreSQL via `GENERATED BY DEFAULT AS IDENTITY`, garantindo numeração sequencial sem conflitos.

---

## 4. Estrutura de Diretórios e Componentes

### 4.1. Backend (`backend/`)

```
backend/
├── app/
│   ├── __init__.py
│   ├── api/                          # CAMADA DE API (Rotas FastAPI)
│   │   ├── main.py                   # FastAPI app: montagem dos routers, CORS
│   │   ├── dependencies.py           # JWT: create_access_token, decode, get_current_user
│   │   └── routers/
│   │       ├── auth.py               # POST /auth/login, GET /auth/me, POST /auth/logout
│   │       ├── products.py           # CRUD /products (com soft delete, search)
│   │       ├── categories.py         # CRUD /categories
│   │       ├── customers.py          # CRUD /customers
│   │       ├── sales.py              # POST /sales, POST /sales/checkout, GET /sales, GET /sales/{id}
│   │       ├── moves.py              # POST /moves, POST /moves/import-xml, POST /moves/transfer
│   │       │                           POST /moves/import/map-products
│   │       │                           POST /moves/import/process-entry, GET /moves
│   │       ├── branches.py           # CRUD /branches
│   │       ├── users.py              # CRUD /users (admin only para criar)
│   │       ├── cash_sessions.py      # POST /cash-sessions/open, /close, GET /current
│   │       └── dashboard.py          # GET /dashboard/inventory-value, /moves-summary,
│   │                                   /moves-graph, /low-stock, /stagnant-products
│   ├── models/                       # CAMADA DE DADOS (SQLModel Models)
│   │   ├── __init__.py
│   │   ├── enums.py                  # UnitType, PaymentMethod, MoveType
│   │   ├── users.py                  # User (id, name, email, password, is_admin, branch_id, ...)
│   │   ├── products.py               # Product (id, name, unit_price, unit_type, category_id, ...)
│   │   ├── categories.py             # Category (id, name)
│   │   ├── branches.py               # Branch (id, name)
│   │   ├── customers.py              # Customer (id, name, cpf_cnpj, phone, points, ...)
│   │   ├── stocks.py                 # Stock (branch_id, product_id, quantity, min/max)
│   │   ├── sales.py                  # Sale (id, branch_id, user_id, total, receipt_number, ...)
│   │   ├── sale_items.py             # SaleItem (sale_id, product_id, quantity, unit_price, subtotal)
│   │   ├── payments.py               # Payment (sale_id, method, amount)
│   │   ├── moves.py                  # Move (type='in'|'out', product_id, branch_id, quantity, ...)
│   │   ├── cash_sessions.py          # CashSession (branch_id, user_id, opening_balance, ...)
│   │   ├── cash_movements.py         # CashMovement (session_id, type, amount, ...)
│   │   └── supplier_maps.py          # SupplierProductMap (supplier_cnpj, code, local_product_id)
│   ├── services/                     # CAMADA DE SERVIÇOS (Lógica auxiliar)
│   │   ├── nfe_parser.py             # parse_nfe_xml() — parse de XML de NFe
│   │   └── unit_mapper.py            # map_unit() — normaliza unidades de medida
│   └── core/                         # CONFIGURAÇÃO CENTRAL
│       └── database.py               # Settings (env vars), engine, get_session, init_db
├── Dockerfile
└── requirements.txt
```

### 4.2. Frontend (`frontend/`)

```
frontend/
├── app/                              # NEXT.JS APP ROUTER
│   ├── layout.tsx                    # Layout root (fonts, providers)
│   ├── globals.css                   # Tailwind + custom CSS
│   └── (painel)/                     # Grupo de rotas autenticadas
│       ├── layout.tsx                # Layout do painel (sidebar, header, auth check)
│       ├── dashboard/
│       │   └── page.tsx              # Dashboard BI (Recharts, filtros)
│       ├── pdv/
│       │   └── page.tsx              # ★ PDV — Frente de Caixa (934 linhas)
│       ├── products/
│       │   ├── page.tsx              # Lista de produtos
│       │   ├── [id]/page.tsx         # Editar produto
│       │   └── add/page.tsx          # Novo produto (inclui upload XML)
│       ├── categories/               # CRUD categorias
│       ├── sales/
│       │   ├── page.tsx              # Histórico de vendas
│       │   └── [id]/page.tsx         # Detalhe da venda (com itens e pagamentos)
│       ├── moves/
│       │   ├── page.tsx              # Histórico de movimentações
│       │   ├── add/page.tsx          # Movimentação manual
│       │   ├── import/page.tsx       # ★ Importação de XML NFe
│       │   └── transfer/page.tsx     # ★ Transferência entre filiais
│       ├── users/                    # CRUD usuários (admin only)
│       ├── caixa/
│       │   └── page.tsx              # Sessão de caixa (abrir/fechar)
│       └── login/
│           └── page.tsx              # Tela de login
│
├── components/                       # COMPONENTES REUTILIZÁVEIS
│   └── ui/                           # shadcn/ui components (button, card, input, table, select, ...)
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── dialog.tsx
│       ├── toast.tsx
│       ├── command.tsx
│       └── ...                        # ~30 componentes shadcn/ui
│
├── contexts/
│   └── SaleContext.tsx                # Contexto de venda (estado global do carrinho PDV)
│                                       # state: { items, customer, discount, payments }
│                                       # actions: addItem, removeItem, addPayment, clearSale, ...
│
├── services/                          # CAMADA DE API (Cliente HTTP)
│   ├── auth.ts                        # login(), getMe()
│   ├── product.ts                     # searchProducts(), getProduct(), createProduct()
│   ├── sale.ts                        # createSale(), getSales(), pdvCheckout()
│   ├── customer.ts                    # searchCustomers(), createCustomer()
│   ├── move.ts                        # createMove(), importXml(), transferStock()
│   ├── dashboard.ts                   # getInventoryValue(), getMovesGraph(), getStagnantProducts()
│   ├── cash-session.ts                # openSession(), closeSession(), getCurrentSession()
│   └── branch-client.ts               # getBranches()
│
├── types/                             # TIPAGEM TYPESCRIPT
│   ├── product.ts                     # Product, ProductCreate
│   ├── sale.ts                        # SaleResponse, Customer, SaleItem
│   ├── customer.ts                    # Customer
│   ├── move.ts                        # Move, MoveType
│   ├── dashboard.ts                   # DashboardData, StagnantProduct
│   ├── stock.ts                       # Stock
│   └── api.ts                         # ApiResponse<T>, ApiListResponse<T>
│
├── lib/
│   ├── client-api.ts                  # Instância axios (baseURL + interceptors)
│   └── utils.ts                       # cn() — utilitário Tailwind merge
│
├── actions/
│   └── auth.ts                        # Server actions (login, logout, getToken)
│
├── proxy.ts                           # Configuração de proxy dev Next.js → FastAPI
├── next.config.ts
├── package.json
└── Dockerfile
```

### 4.3. Mapa de Rotas da API (Resumo)

| Método | Rota | Módulo | Descrição |
|--------|------|--------|-----------|
| POST | `/api/auth/login` | auth | Login (retorna JWT) |
| GET | `/api/auth/me` | auth | Dados do usuário atual |
| GET/POST | `/api/products` | products | CRUD produtos |
| GET | `/api/products/search` | products | Busca por nome |
| GET/POST | `/api/categories` | categories | CRUD categorias |
| GET/POST | `/api/customers` | customers | CRUD clientes |
| GET/POST | `/api/sales` | sales | CRUD vendas (legado) |
| **POST** | **`/api/sales/checkout`** | **sales** | **★ PDV Rápido (ACID)** |
| GET | `/api/sales/{id}` | sales | Detalhe venda |
| GET/POST | `/api/moves` | moves | CRUD movimentações |
| **POST** | **`/api/moves/transfer`** | **moves** | **★ Transferência (ACID)** |
| **POST** | **`/api/moves/import-xml`** | **moves** | **★ Importação XML** |
| POST | `/api/moves/import/map-products` | moves | Mapear fornecedor→produto |
| POST | `/api/moves/import/process-entry` | moves | Processar entrada lote |
| GET/POST | `/api/branches` | branches | CRUD filiais |
| GET/POST | `/api/users` | users | CRUD usuários |
| POST | `/api/cash-sessions/open` | cash_session | Abrir caixa |
| POST | `/api/cash-sessions/close` | cash_session | Fechar caixa |
| GET | `/api/cash-sessions/current` | cash_session | Sessão atual |
| GET | `/api/dashboard/inventory-value` | dashboard | Valor do estoque |
| GET | `/api/dashboard/moves-graph` | dashboard | Gráfico mov. (Recharts) |
| GET | `/api/dashboard/low-stock` | dashboard | Estoque crítico |
| GET | `/api/dashboard/stagnant-products` | dashboard | Produtos estagnados |

---

## 5. Glossário de Termos Técnicos

| Termo | Significado no Eletrosil |
|-------|-------------------------|
| **ACID** | Conjunto de propriedades (Atomicity, Consistency, Isolation, Durability) que garantem que transações críticas (vendas, transferências) sejam processadas corretamente mesmo sob concorrência |
| **RBAC** | Role-Based Access Control — controle de acesso baseado em perfis (Admin vs Operador) |
| **NFe** | Nota Fiscal Eletrônica — XML padronizado pela SEFAZ que o sistema importa |
| **Soft Delete** | Exclusão lógica: em vez de deletar um registro, marca-se `deleted_at` com a data/hora. O sistema ignora esses registros nas consultas |
| **Split Payment** | Pagamento dividido entre múltiplas formas (ex: R$ 50 em dinheiro + R$ 100 no cartão) |
| **Upsert** | Operação que insere um registro ou, se já existir, atualiza. Usado no estoque (`INSERT ... ON CONFLICT DO UPDATE`) |
| **Identity Column** | Coluna numérica gerada automaticamente pelo PostgreSQL. Usada no `receipt_number` da venda |
| **Enum** | Tipo de dado que restringe valores a um conjunto fixo. Ex: `UnitType.UN`, `PaymentMethod.PIX` |
| **Debounce** | Técnica que atrasa uma ação (ex: busca de produtos) até que o usuário pare de digitar, evitando requisições desnecessárias |
| **JWT** | JSON Web Token — formato de token de autenticação auto-contido, assinado digitalmente |
| **Session** | Sessão do SQLModel — representa uma conexão com o banco dentro de uma transação |

---

> **Nota final:** Este documento reflete o estado atual do repositório. Durante a pausa no desenvolvimento, use-o como referência para estudos, troubleshooting e planejamento de futuras features. Qualquer alteração no código deve ser acompanhada da atualização correspondente neste guia.
