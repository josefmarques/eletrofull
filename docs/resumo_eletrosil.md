# Resumo Técnico - Projeto Eletrosil (Migração Python)

> **Data**: 08 de Maio de 2026  
> **Versão**: 2.0 — Arquitetura Python/FastAPI  
> **Stack Anterior**: Node.js (Express) + Drizzle ORM ← *Substituída*

---

## 📋 Visão Geral

O **Eletrosil** é um sistema completo de **PDV (Ponto de Venda)** + **Gerenciamento de Estoque** desenvolvido para a empresa de componentes elétricos Eletrosil. O sistema opera em produção na **Google Cloud Platform (GCP)** no domínio **eletrosil.top**.

O backend foi recentemente **migrado de Node.js (Express) para Python (FastAPI)**, visando maior performance, tipagem estrita de dados e escalabilidade com ORM moderno.

---

## 🏗️ Arquitetura & Stack Tecnológico

### Frontend (Mantido — sem alterações)

| Componente          | Tecnologia                |
|---------------------|---------------------------|
| Framework           | Next.js 16.1.1 (App Router) |
| UI Framework        | React 19.2.3              |
| Estilização         | TailwindCSS 4 + Shadcn/UI |
| Validação           | Zod 4.3.5 + React Hook Form |
| Gráficos            | Recharts 3.6.0            |
| Gerenciamento de Estado | Context API (SaleContext) |

### Backend (Nova Arquitetura — Python)

| Componente          | Tecnologia                    |
|---------------------|-------------------------------|
| Runtime             | Python 3.11+                  |
| Framework Web       | FastAPI 0.136.1               |
| Servidor ASGI       | Uvicorn 0.46.0                |
| ORM                 | SQLModel 0.0.38 (baseado em SQLAlchemy) |
| Banco de Dados      | PostgreSQL 17                 |
| Autenticação        | PyJWT + Passlib (Bcrypt)      |
| Validação           | Pydantic v2                   |

### Infraestrutura

| Componente        | Tecnologia                      |
|--------------------|----------------------------------|
| Containerização    | Docker + Docker Compose (V2)     |
| Proxy Reverso      | Nginx Alpine                     |
| SSL/TLS            | Let's Encrypt + Certbot          |
| Hospedagem         | Google Cloud Platform (GCP)      |
| CI/CD              | Scripts shell customizados em `/gerencia/` |

---

## 📁 Estrutura do Projeto

```
eletrosil-python/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routers/              # Endpoints (auth.py, sales.py, dashboard.py, etc.)
│   │   │   └── dependencies.py       # Injeção de dependências (ex: get_current_user)
│   │   ├── core/                     # Configurações globais, segurança, database.py
│   │   └── models/                   # Classes SQLModel (Tabelas do Banco)
│   ├── main.py                       # Ponto de entrada do FastAPI
│   ├── requirements.txt              # Dependências Python
│   └── Dockerfile                    # Imagem otimizada para Python
├── frontend/
│   ├── app/
│   │   ├── (painel)/                 # Rotas protegidas do dashboard
│   │   ├── login/                    # Página de autenticação
│   │   ├── api/                      # Routes API (proxy)
│   │   └── layout.tsx                # Layout principal
│   ├── components/                   # Componentes reutilizáveis
│   └── ...                           # (Padrão Next.js mantido)
├── docker-compose.yaml               # Orquestração de containers (Produção)
├── docker-compose.local.yaml         # Orquestração de containers (Dev local)
├── nginx.conf                        # Configuração proxy (apontando porta 8080)
├── gerencia/                         # Scripts de deploy, backup e restore
└── certbot/                          # Certificados SSL
```

---

## 🚀 Módulos Implementados

### 1. 🔐 Autenticação & Autorização

- Login com email/senha gerando **token JWT de alta entropia** (256 bits).
- Hash de senhas gerenciado pelo **Passlib (Bcrypt)**.
- Injeção de dependência (**`get_current_user`**) protegendo rotas privadas.
- **Router**: `auth.py`

### 2. 👥 Gestão de Usuários e Filiais

- Cadastro de **operadores, gerentes e admin**.
- Controle de acessos via **RBAC multi-filial** (Matriz, Norte, Sul).
- **Routers**: `users.py`, `branches.py`

### 3. 📦 Catálogo de Produtos

- Categorias de produtos integradas com **unidades de medida específicas** (metros, rolos, peças).
- Controle de **preços e custos**.
- **Routers**: `products.py`, `categories.py`

### 4. 📊 Estoque Multi-Filial

- Separação lógica de **quantidade por filial** na tabela `stocks`.
- Histórico **imutável** de movimentações (`moves` tipo `IN` e `OUT`).
- **Routers**: `stocks.py`, `moves.py`

### 5. 🧾 Ponto de Venda (PDV) & Vendas

- Transações de venda **atômicas**.
- ⭐ **Regra Especial de Admin**: O Admin Global pode efetuar vendas para **qualquer filial** sem estar atrelado a uma unidade fixa e **sem a necessidade de um caixa aberto**, bastando informar o `branch_id` no payload da requisição.
- **Abate imediato** de saldo de estoque pós-venda.
- **Router**: `sales.py`

### 6. 💰 Tesouraria

- Abertura/fechamento de sessão de caixa (`cash_sessions`).
- Registro atrelado **obrigatório** para operadores padrão efetuarem vendas.
- **Router**: `cash_sessions.py`

### 7. 📈 Dashboard & Inteligência de Negócio

- Gráficos diários de **faturamento** e **volume de saídas**.
- Alerta em tempo real de **produtos com Estoque Baixo** e **Produtos Estagnados**.
- Subqueries otimizadas via **SQLAlchemy** para relatórios complexos.
- **Router**: `dashboard.py`

---

## 🗄️ Banco de Dados

### Entidades Principais (SQLModel)

```
Usuários (User)
├── Autenticação (email, password hash, JWT)
└── Permissões (is_admin, branch_id)

Produtos (Product) → Pertence a Categoria (Category)
├── Detalhes (unit_price, unit_type)
└── Estoque (Stock) ← Relacionamento 1:N por filial

Vendas (Sale)
├── Itens da Venda (SaleItem) ← Guarda snapshot do preço na hora da venda
└── Movimentações (Move) ← Trigger gerada para abater estoque
```

---

## 🐳 Docker & Deployment

### Containers em Produção

| Serviço     | Status        | Porta Interna | Porta Externa       |
|-------------|---------------|---------------|---------------------|
| nginx-proxy | ✅ Running    | 80, 443       | 80, 443             |
| backend     | ✅ Running    | 8080          | — (via Nginx Proxy) |
| frontend    | ✅ Running    | 3000          | — (via Nginx Proxy) |
| postgres    | ✅ Healthy    | 5432          | 5432 (Fechado para web) |

### Comandos de Operação

```bash
# Subir ambiente de produção na GCP
./gerencia/deploy-producao.sh

# Acessar logs do Python em tempo real
docker logs -f backend

# Forçar restore do banco de dados (Reset de Schema)
./gerencia/restore_db.sh
```

---

## 🔐 Credenciais de Acesso & Segurança

| Ambiente   | Produção                         |
|------------|----------------------------------|
| **URL**    | https://eletrosil.top             |

| Perfil        | Email                    | Senha       | Acesso                                           |
|---------------|--------------------------|-------------|--------------------------------------------------|
| Admin Global  | admin@eletrosil.top      | mrq831028   | Total — vende em qualquer filial sem caixa aberto |

> **Nota de Segurança**: A `JWT_SECRET` foi alterada para uma chave hexadecimal de **64 caracteres (256 bits)** diretamente no `docker-compose.yaml` da VM, garantindo resiliência criptográfica.

---

## 📊 Status Atual

### ✅ Concluído (Fase Migração)

- [x] Backend totalmente reescrito em **Python/FastAPI**.
- [x] Mapeamento de Banco de Dados via **SQLModel**.
- [x] Restauração de dados do ambiente Node legado para o **PostgreSQL 17** novo.
- [x] Liberação de **Vendas Cross-Branch** para perfil Admin.
- [x] Dashboard de KPIs operando com **Subqueries SQLAlchemy**.

### ⏳ Próximos Passos (Roadmap)

| Sprint | Foco                                             | Status |
|--------|--------------------------------------------------|--------|
| 4      | Importação de XML de Notas Fiscais (NFe) via **FastAPI BackgroundTasks** | ⏳ Pendente |
| 5      | Geração de NFC-e via API fiscal + BI (Curva ABC) | ⏳ Pendente |
| —      | Implementar **Service Workers** no Frontend para modo Offline (PWA) | ⏳ Pendente |

---

## 📝 Notas Importantes da Engenharia (DevOps)

1. **Stack Alterada**: O projeto **não utiliza mais Express.js/Drizzle**. Documentações antigas que citem Node.js no backend devem ser **desconsideradas**.

2. **Schema Public**: O script de restore do banco de dados na GCP utiliza um **"Pre-clean"** (`DROP SCHEMA public CASCADE`) para evitar conflito de tipagem deixado pelo antigo ORM (Drizzle).

3. **Comunicação Interna**: O frontend Next.js comunica-se com o backend via **rede Docker interna** apontando para `http://backend:8080` (variável `INTERNAL_API_URL`).

---

## 📞 Conectividade GCP

| Item               | Valor                  |
|--------------------|------------------------|
| Servidor Produção  | 34.xxx.xxx.3 (GCP)     |
| Usuário SSH        | eletrosil_hidraulica   |
| Chave Local        | `~/.ssh/gcp_eletrosil` |

---

> **Última Atualização**: 08 de Maio de 2026 — *Documento compatível com a arquitetura Python/FastAPI v2.0*
