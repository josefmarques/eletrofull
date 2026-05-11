# 🏪 Plano de Engenharia: Evolução Eletrosil (Estoque + PDV)

> **Documento oficial de arquitetura e roadmap** para transformar o sistema de gerenciamento de estoque em uma plataforma completa de Ponto de Venda (PDV) integrada, baseada em arquitetura de alta performance.

---

## 1. 📐 Visão Geral da Arquitetura

A stack tecnológica foi modernizada para garantir escalabilidade, segurança e processamento de dados eficiente:

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Backend** | FastAPI + Uvicorn (ASGI) | Python 3.11+ |
| **ORM** | SQLModel (SQLAlchemy) | — |
| **Banco de Dados** | PostgreSQL | 17 |
| **Frontend** | Next.js (App Router) + TailwindCSS + Shadcn/UI | 16.1.1 / 4 |
| **Infraestrutura** | Docker + Docker Compose + Nginx (Proxy Reverso) | — |
| **Cloud** | Google Cloud Platform (GCP) | — |

---

## 2. 🗄️ Fase de Dados: Expansão do Esquema

Para suportar o PDV, o banco de dados e os modelos do SQLModel devem evoluir além do simples catálogo de produtos.

### 2.1. Novas Entidades (Tabelas)

| Entidade | Descrição | Campos Principais |
|----------|-----------|-------------------|
| `customers` | Cadastro de clientes | Nome, CPF/CNPJ, Pontos de Fidelidade |
| `cash_sessions` | Controle de abertura/fechamento de caixa | Filial, sangrias, reforços |
| `sales` | Registro da venda | Filial, operador, cliente, bruto, descontos, líquido |
| `sale_items` | Detalhamento dos produtos vendidos | Preço praticado, quantidade |
| `payments` | Registro das formas de pagamento | Dinheiro, PIX, Cartão, TEF |

---

## 3. 🛒 Fase de Funcionalidades: Ponto de Venda (PDV)

A "Frente de Caixa" exige uma interface otimizada para velocidade e um backend de rápida resposta.

### 3.1. Funcionalidades do Terminal de Vendas

#### 🔍 Busca Semântica e Código de Barras
- Integração com leitores ópticos para adição instantânea de itens
- Endpoints rápidos do FastAPI para resposta em milissegundos

#### 💰 Operações de Tesouraria
- **Sangria**: Retirada de valores do caixa
- **Aporte**: Reforço de valores no caixa
- Validação obrigatória de sessão de caixa aberta

#### 💳 Integração de Pagamentos
- Fluxo para **múltiplas formas de pagamento** em uma única venda
- Ex: Parte em dinheiro, parte em PIX

#### 📱 Modo Offline (PWA)
- Service Workers + IndexedDB no frontend
- Permite vendas durante instabilidades de rede
- Sincronização automática com a API na GCP após reconexão

---

## 4. 🔗 Fase de Integração: Estoque Inteligente

A conexão em tempo real entre a venda e o inventário é o coração do sistema.

### 4.1. Automações Críticas

| Automação | Descrição |
|-----------|-----------|
| **Baixa Automática** | Transações atômicas no banco para descontar o saldo da filial assim que a venda é confirmada (evita concorrência e saldo negativo) |
| **Gestão de Lotes e Grades** | Rastreabilidade de itens por voltagem ou lote de fabricação |
| **Importação de XML (NFe)** | Processamento em background com `BackgroundTasks` do FastAPI para leitura automática de NF-e de fornecedores |
| **Alertas de Reabastecimento** | Dashboard gerencial identificando produtos abaixo do estoque mínimo ou estagnados em filiais específicas |

---

## 5. 📊 Fase de Gestão e Fiscal

Conformidade legal e inteligência de negócio.

### 5.1. Relatórios e Compliance

#### 🧾 Emissão de NFC-e
- Integração com API de mensageria fiscal
- Emissão automática de cupons fiscais eletrônicos

#### 📈 DRE (Demonstração do Resultado)
- Relatório de saúde financeira
- **Receitas − Custos − Despesas = Lucro**

#### 🏆 Curva ABC
- Identificação dos produtos que mais geram lucro e giro

---

## 6. 📅 Cronograma de Implementação (Roadmap)

| Sprint | Objetivo | Meta Principal |
|--------|----------|----------------|
| **Sprint 1** | Estrutura de Vendas | Criar tabelas e modelos de `sales` e `customers` |
| **Sprint 2** | PDV Básico | Interface de venda no Next.js com leitor de código de barras |
| **Sprint 3** | Financeiro | Módulo de abertura/fechamento de `cash_sessions` e controle de permissões de venda |
| **Sprint 4** | Automação | Importação de XML e baixa automática de estoque no backend |
| **Sprint 5** | Fiscal e BI | Geração de NFC-e e Dashboards consolidados de faturamento |

---

## 7. 🛡️ Segurança, Acessos e Infraestrutura

### 7.1. RBAC (Role Based Access Control)

| Perfil | Acessos |
|--------|---------|
| **Admin Global** | Visão total, sem vínculo estrito de caixa |
| **Gerente de Loja** | Caixa e estoque local |
| **Operador** | Apenas vendas |

### 7.2. Segurança de Tokens (JWT)

- Utilização de chaves de **alta entropia** (mínimo **32 bytes / 256 bits** via HS256)
- Configuradas estritamente em **variáveis de ambiente** de produção
- Garante blindagem contra falsificação de sessão

### 7.3. Logs de Auditoria

Rastreamento de:
- Alterações manuais em estoques
- Cancelamentos de vendas
- Falhas de autorização

### 7.4. Proxy e SSL

- Gerenciamento de tráfego seguro
- Renovação de certificados automatizada via **Nginx + Certbot**
- Interceptação de chamadas para a porta interna da aplicação

---

> **Documento mantido pela equipe de engenharia Eletrosil**  
> *Última atualização: conforme andamento do projeto*
