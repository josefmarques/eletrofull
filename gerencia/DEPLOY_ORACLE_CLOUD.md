# Deploy na Oracle Cloud - Guia Completo

## 📋 Visão Geral

| Ambiente | Localização |
|----------|-------------|
| **Desenvolvimento** | Windows/WSL: `/mnt/c/Users/jf-ma/diario-de-estudos-new/` |
| **Produção** | Oracle Cloud VM: `~/diario-de-estudos-prod/` |

## 📁 Arquivos que DEVEM ser copiados para a VM

```
diario-de-estudos/
├── docker-compose.prod.yml    → NOVO: Docker Compose de produção
├── Dockerfile                  → Já existe
├── package.json                → Já existe
├── package-lock.json           → Já existe
├── server.js                   → Já existe
├── public/                     → Já existe (todos os arquivos)
├── scripts/
│   └── db/
│       ├── init.js            → Executa migrations automaticamente
│       └── migrations/        → Todas as migrations (001 a 010)
└── src/                        → Já existe (todo o código fonte)
```

## 🚀 Passo a Passo do Deploy

### PASSO 1: No seu Windows/WSL - Preparar arquivos

```bash
cd /mnt/c/Users/jf-ma/diario-de-estudos
```

### PASSO 2: Copiar para a VM

```bash
# Opção A: Copiar tudo via SCP (pode demorar)
scp -r * ubuntu@SUA_VM_IP:~/diario-de-estudos-prod/

# Opção B: Criar tar e enviar (mais rápido)
tar czf diario-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    .
scp diario-deploy.tar.gz ubuntu@SUA_VM_IP:~/
```

### PASSO 3: Na VM - Conectar via SSH

```bash
ssh ubuntu@SUA_VM_IP
```

### PASSO 4: Na VM - Backup e Deploy

```bash
# 4.1. Criar diretório de backup se não existir
mkdir -p ~/backups-oci

# 4.2. Copiar o script de deploy
# (Se você ainda não copiou, copie o arquivo deploy-oracle-cloud.sh)

# 4.3. Dar permissão e executar
chmod +x ~/diario-de-estudos-prod/deploy-oracle-cloud.sh
cd ~/diario-de-estudos-prod
./deploy-oracle-cloud.sh
```

### OU - Execute manualmente (sem script):

```bash
# Na VM ~/diario-de-estudos-prod

# 1. Backup do banco
docker exec diario-db pg_dump -U postgres estudos > ~/backups-oci/backup_pre_deploy_$(date +%Y%m%d).sql

# 2. Parar containers antigos
cd ~/gerencia
docker-compose down

# 3. Ir para novo diretório
cd ~/diario-de-estudos-prod

# 4. Subir novos containers (build e executa migrations automaticamente)
docker-compose -f docker-compose.prod.yml --project-name diario up -d --build

# 5. Verificar logs
docker logs -f diario-app
```

## ✅ Verificação pós-deploy

```bash
# Ver containers rodando
docker ps

# Ver logs da aplicação
docker logs -f diario-app

# Ver logs do banco
docker logs -f diario-db

# Testar resposta HTTP
curl http://localhost:3000

# Entrar no container para verificar
docker exec -it diario-app sh
```

## 🔄 Rollback (se der problema)

```bash
# Parar nova versão
cd ~/diario-de-estudos-prod
docker-compose -f docker-compose.prod.yml down

# Voltar para versão antiga
cd ~/gerencia
docker-compose up -d

# Restaurar banco se necessário
docker exec -i diario-db psql -U postgres estudos < ~/backups-oci/backup_pre_deploy_YYYYMMDD.sql
```

## 📝 Diferenças: docker-compose.yml vs docker-compose.prod.yml

| Característica | Desenvolvimento (local) | Produção (VM) |
|----------------|------------------------|---------------|
| Target do build | `development` | `production` |
| Volumes | Monta código fonte (hot reload) | Imagem otimizada |
| Network | `diario-estudos-network` | `cronometro-network` |
| Ports | `3000:3000` | `127.0.0.1:3000:3000` |
| Restart | `unless-stopped` | `always` |

## 🔧 Troubleshooting

**Erro: "Port 3000 already in use"**
```bash
# Ver o que está usando
sudo lsof -i :3000
# Matar processo se necessário
```

**Erro: "Database connection failed"**
```bash
# Verificar saúde do banco
docker exec diario-db pg_isready -U postgres

# Ver logs do banco
docker logs diario-db
```

**Migrations não rodaram**
```bash
# Executar manualmente
docker exec -it diario-app node scripts/db/init.js
```

## 📦 Arquivos criados para este deploy

1. `docker-compose.prod.yml` - Docker Compose de produção
2. `gerencia/deploy-oracle-cloud.sh` - Script de deploy automatizado
3. `gerencia/DEPLOY_ORACLE_CLOUD.md` - Este guia
