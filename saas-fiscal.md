# Documento Técnico — SaaS Fiscal Especializado para PDV/ERP

> Explicação técnica e estratégica sobre o uso de plataformas SaaS fiscais em sistemas de PDV, ERP e emissão de documentos fiscais eletrônicos no Brasil.

---

# 1. Introdução

Quando a arquitetura recomenda:

```text
Fiscal:
- SaaS fiscal especializado
```

isso significa:

> utilizar uma plataforma externa especializada para realizar toda a comunicação fiscal com a SEFAZ e gerenciar a complexidade tributária brasileira.

O sistema principal continua responsável pelas regras de negócio do PDV e do estoque, enquanto o SaaS fiscal assume as responsabilidades fiscais e tributárias.

---

# 2. O que é um SaaS Fiscal

SaaS fiscal é uma plataforma especializada que disponibiliza APIs para:

* emissão de NFC-e;
* emissão de NF-e;
* cancelamento de notas;
* inutilização;
* contingência;
* assinatura digital;
* geração de DANFE;
* validação fiscal;
* comunicação com SEFAZ;
* armazenamento de XML.

O sistema da empresa envia os dados da venda para a API fiscal e recebe de volta o documento autorizado.

---

# 3. Fluxo Simplificado da Arquitetura

```text
PDV / ERP
    ↓
API Backend (FastAPI)
    ↓
SaaS Fiscal
    ↓
SEFAZ
```

---

# 4. Exemplo de Dados Enviados

O sistema envia os dados da venda para o SaaS fiscal.

## Exemplo

```json
{
  "cliente": "José",
  "cpf": "00000000000",
  "itens": [
    {
      "produto": "TV",
      "ncm": "85287200",
      "cfop": "5102",
      "valor": 3000
    }
  ],
  "pagamento": "PIX"
}
```

---

# 5. Responsabilidades do SaaS Fiscal

Após receber os dados da venda, o SaaS fiscal:

* gera o XML fiscal;
* assina digitalmente;
* transmite para SEFAZ;
* trata rejeições fiscais;
* gerencia contingência;
* gera DANFE;
* retorna protocolo autorizado.

---

# 6. Complexidade Fiscal Brasileira

O ambiente tributário brasileiro possui alta complexidade técnica e legal.

## Principais desafios

| Complexidade        | Descrição          |
| ------------------- | ------------------ |
| Certificado digital | A1/A3              |
| Assinatura XML      | ICP-Brasil         |
| Comunicação SEFAZ   | Por estado         |
| Rejeições fiscais   | Centenas de regras |
| CSC                 | NFC-e              |
| QRCode fiscal       | Obrigatório        |
| Contingência        | Offline            |
| Cancelamentos       | Regras legais      |
| Inutilização        | Controle numérico  |
| Tributação          | ICMS/PIS/COFINS    |
| CFOP/CST/NCM        | Obrigatórios       |

---

# 7. Por que NÃO desenvolver isso internamente

Implementar um motor fiscal completo exige:

* especialistas fiscais;
* atualização constante da legislação;
* monitoramento de mudanças estaduais;
* homologação contínua;
* manutenção complexa.

Mesmo ERPs conhecidos frequentemente utilizam plataformas fiscais terceirizadas.

---

# 8. Benefícios do SaaS Fiscal

| Benefício                            | Impacto    |
| ------------------------------------ | ---------- |
| Redução de complexidade              | Muito alto |
| Atualização automática da legislação | Muito alto |
| Redução de risco tributário          | Muito alto |
| Menor tempo de desenvolvimento       | Muito alto |
| Menos bugs fiscais                   | Muito alto |
| Suporte especializado                | Muito alto |

---

# 9. O que continua sendo responsabilidade do sistema

Mesmo utilizando SaaS fiscal, o sistema ainda controla:

* vendas;
* estoque;
* clientes;
* caixa;
* pagamentos;
* relatórios;
* dashboards;
* sincronização offline;
* gestão operacional.

O SaaS fiscal cuida exclusivamente da camada fiscal.

---

# 10. Principais Plataformas SaaS Fiscais

## 10.1 Tecnospeed

### Pontos fortes

* alta maturidade;
* suporte forte;
* cobre múltiplos documentos fiscais;
* ampla adoção no mercado.

### Ponto de atenção

* custo mais elevado.

---

## 10.2 Focus NFe

### Pontos fortes

* API moderna;
* integração simples;
* boa documentação.

### Ponto de atenção

* menos recursos avançados.

---

## 10.3 PlugNotas

### Pontos fortes

* integração simples;
* foco em cloud;
* excelente para microsserviços.

---

# 11. Exemplo de Integração com FastAPI

```python
response = requests.post(
    "https://api.fiscal.com/nfce",
    json=dados_venda,
    headers={"Authorization": TOKEN}
)
```

---

# 12. Exemplo de Resposta

```json
{
  "status": "autorizado",
  "chave": "3126...",
  "xml": "...",
  "danfe": "url..."
}
```

---

# 13. Desafios que ainda permanecem

| Problema              | Responsabilidade |
| --------------------- | ---------------- |
| fila de emissão       | sistema          |
| retry                 | sistema          |
| internet indisponível | sistema          |
| sincronização offline | sistema          |
| contingência local    | parcial          |
| numeração             | compartilhada    |

---

# 14. Arquitetura Recomendada

```text
PDV Frontend
    ↓
FastAPI
    ↓
Fila (Redis/RabbitMQ)
    ↓
Worker Fiscal
    ↓
SaaS Fiscal
    ↓
SEFAZ
```

---

# 15. Recomendação Crítica

## NÃO emitir fiscal diretamente na requisição do PDV

Fluxo incorreto:

```text
Cliente aguarda resposta da SEFAZ
```

Isso é perigoso porque a SEFAZ:

* pode ficar lenta;
* pode cair;
* pode rejeitar;
* pode oscilar.

---

# 16. Fluxo Correto Recomendado

1. venda é salva no banco;
2. venda entra em fila;
3. worker fiscal processa;
4. status fiscal é atualizado;
5. frontend acompanha status.

---

# 17. Tecnologias Recomendadas

| Tecnologia | Finalidade          |
| ---------- | ------------------- |
| Redis      | Cache e filas       |
| RabbitMQ   | Mensageria          |
| Celery     | Workers assíncronos |
| PostgreSQL | Persistência        |
| FastAPI    | API backend         |

---

# 18. Conclusão

A recomendação:

```text
Fiscal:
- SaaS fiscal especializado
```

significa:

> terceirizar toda a complexidade fiscal e tributária brasileira para plataformas especializadas, permitindo que o sistema principal permaneça focado nas regras de negócio do PDV, estoque e gestão empresarial.

---

# 19. Benefícios Estratégicos

* redução drástica da complexidade;
* menor risco tributário;
* menor tempo de desenvolvimento;
* maior estabilidade;
* atualização automática da legislação;
* menor necessidade de equipe fiscal interna;
* maior foco no negócio principal.
