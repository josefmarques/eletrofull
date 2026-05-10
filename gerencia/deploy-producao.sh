#!/bin/bash
set -e

# ============================================
# Configurações Gerais
# ============================================
VM_USER="eletrosil_hidraulica"
VM_HOST="34.151.221.3"
VM_KEY="${HOME}/.ssh/gcp_eletrosil"
PROJECT_DIR="eletrosil"
BACKUP_DIR="backups-eletrosil"
DATE=$(date +%Y%m%d_%H%M%S)

DB_CONTAINER="postgres"
DB_USER="zemarques"
DB_NAME="estoque-db"

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar se chave SSH existe
if [ ! -f "$VM_KEY" ]; then
    echo -e "${RED}❌ Erro: Chave SSH não encontrada em $VM_KEY${NC}"
    exit 1
fi

ssh_exec() {
    ssh -i "$VM_KEY" -o StrictHostKeyChecking=no "${VM_USER}@${VM_HOST}" "$@"
}

echo -e "${BLUE}===> [1/7] Backup do Banco de Dados${NC}"
ssh_exec "mkdir -p ~/$BACKUP_DIR"
CONTAINER_CHECK=$(ssh_exec "docker ps -a --format '{{.Names}}' | grep -w $DB_CONTAINER || true")
if [ -n "$CONTAINER_CHECK" ]; then
    ssh_exec "docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME > ~/$BACKUP_DIR/db_$DATE.sql" || true
fi

echo -e "${BLUE}===> [2/7] Empacotando aplicação${NC}"
DEPLOY_FILE="/tmp/eletrosil-$DATE.tar.gz"
tar czf "$DEPLOY_FILE" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.env' \
    --exclude='frontend/.next' \
    --exclude='backend/dist' \
    --warning=no-file-changed .

echo -e "${BLUE}===> [3/7] Transferindo arquivos${NC}"
scp -i "$VM_KEY" "$DEPLOY_FILE" "${VM_USER}@${VM_HOST}:~/"

echo -e "${BLUE}===> [4/7] Preparando ambiente na VM (Limpeza de Cache)${NC}"
ssh_exec "
    # Garante que a pasta de certificados existe para não quebrar o Nginx[cite: 1]
    sudo mkdir -p /etc/eletrosil-certs
    
    if [ -d ~/$PROJECT_DIR ]; then
        cd ~/$PROJECT_DIR && docker compose down --remove-orphans || true
        # Limpa cache do Next.js para garantir que o PDV suba atualizado[cite: 1]
        rm -rf frontend/.next 
        mv ~/$PROJECT_DIR ~/${PROJECT_DIR}_old_$DATE
    fi

    mkdir -p ~/$PROJECT_DIR
    tar xzf ~/$(basename $DEPLOY_FILE) -C ~/$PROJECT_DIR
    rm ~/$(basename $DEPLOY_FILE)
"

echo -e "${BLUE}===> [5/7] Build e Startup (Produção)${NC}"
ssh_exec "cd ~/$PROJECT_DIR && docker compose up --build -d"

echo -e "${BLUE}===> [6/7] Limpeza de imagens antigas${NC}"
ssh_exec "docker image prune -f"

echo -e "${BLUE}===> [7/7] Healthcheck${NC}"
sleep 20
ssh_exec "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

if ssh_exec "curl -s -k -I https://localhost | grep -q '200\|301\|302'"; then
    echo -e "${GREEN}🚀 DEPLOY CONCLUÍDO! Sistema online em https://eletrosil.top ${NC}"
else
    echo -e "${RED}⚠️  Atenção: O sistema subiu, mas o check de HTTPS falhou. Verifique os logs: docker compose logs nginx${NC}"
fi

rm -f "$DEPLOY_FILE"