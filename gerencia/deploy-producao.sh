#!/bin/bash
set -e

# ─── Auto-detectar diretorio raiz do projeto ──────────────────────────────
# O script pode estar em /caminho/para/eletrofull/gerencia/
# ou em /caminho/para/eletrofull/
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"  # Sobe um nivel: gerencia/ -> eletrofull/

# Se o script estiver na raiz, ajusta
[ "$(basename "$SCRIPT_DIR")" != "gerencia" ] && PROJECT_ROOT="$SCRIPT_DIR"

cd "$PROJECT_ROOT"
echo -e "Diretorio raiz: $PROJECT_ROOT"

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
DB_NAME="eletrosil_db"
DB_NAME_EMARQUES="emarques_db"

# Dominios Multi-Tenant
DOMAINS=("eletrosil.top" "eletromarques.top")
EMAIL="zemarques@eletrosil.top"

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

# ═══════════════════════════════════════════════════════════════════════════════
# [0/8] Certificados SSL
# ═══════════════════════════════════════════════════════════════════════════════
# Se executar com --certs-only: tenta Let's Encrypt (webroot)
# Senao: gera self-signed temporario se necessario
CERTS_HOST_PATH="/etc/eletrosil-certs"
ssh_exec "sudo mkdir -p $CERTS_HOST_PATH /var/www/certbot 2>/dev/null"

# ── Modo --certs-only: Let's Encrypt ──
if [ "$CERTS_ONLY" = true ]; then
  echo -e "${BLUE}==> [--certs-only] Gerando certificados Let's Encrypt${NC}"
  echo -e "${YELLOW}ATENCAO: Se os dominios estiverem atras do Cloudflare proxy,"
  echo -e "o HTTP-01 vai falhar. Pause o proxy (DNS only) ou use DNS-01.${NC}"
  for DOMAIN in "${DOMAINS[@]}"; do
    echo -e "   Tentando $DOMAIN ..."
    ssh_exec "
      sudo docker run --rm \
        -v $CERTS_HOST_PATH:/etc/letsencrypt \
        -v /var/www/certbot:/var/www/certbot \
        certbot/certbot certonly --webroot \
        -w /var/www/certbot \
        -d $DOMAIN -d www.$DOMAIN \
        --email $EMAIL --agree-tos --non-interactive 2>&1
    " && echo -e "${GREEN}   OK $DOMAIN Let's Encrypt OK${NC}" || \
      echo -e "${YELLOW}   ATENCAO $DOMAIN falhou (Cloudflare proxy ativo?)${NC}"
  done
  echo -e "${GREEN}Pronto. Reinicie o nginx: ssh ... docker restart nginx-proxy${NC}"
  exit 0
fi

# ── Modo normal: verifica ou gera self-signed ──
echo -e "${BLUE}==> [0/8] Verificando certificados SSL${NC}"
for DOMAIN in "${DOMAINS[@]}"; do
  CERT_PATH="$CERTS_HOST_PATH/live/$DOMAIN/fullchain.pem"
  if ssh_exec "sudo test -f $CERT_PATH 2>/dev/null"; then
    echo -e "${GREEN}   OK $DOMAIN certificado existe${NC}"
  else
    echo -e "${YELLOW}   ATENCAO $DOMAIN sem certificado. Gerando self-signed...${NC}"
    ssh_exec "
      sudo mkdir -p $CERTS_HOST_PATH/live/$DOMAIN
      sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout $CERTS_HOST_PATH/live/$DOMAIN/privkey.pem \
        -out $CERTS_HOST_PATH/live/$DOMAIN/fullchain.pem \
        -subj \"/CN=$DOMAIN\" 2>/dev/null
      echo 'OK self-signed'
    "
    echo -e "${YELLOW}   Self-signed para $DOMAIN (depois: ./deploy-producao.sh --certs-only)${NC}"
  fi
done

echo -e "${BLUE}===> [1/8] Backup dos Bancos de Dados${NC}"
ssh_exec "mkdir -p ~/$BACKUP_DIR"

# Backup eletrosil_db
if ssh_exec "docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME > ~/$BACKUP_DIR/eletrosil_db_$DATE.sql 2>/dev/null"; then
    echo -e "${GREEN}   OK eletrosil_db backup${NC}"
fi

# Backup emarques_db
if ssh_exec "docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME_EMARQUES > ~/$BACKUP_DIR/emarques_db_$DATE.sql 2>/dev/null"; then
    echo -e "${GREEN}   OK emarques_db backup${NC}"
fi

echo -e "${BLUE}===> [2/8] Empacotando aplicação${NC}"
DEPLOY_FILE="/tmp/eletrosil-$DATE.tar.gz"
tar czf "$DEPLOY_FILE" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.env' \
    --exclude='frontend/.next' \
    --exclude='backend/dist' \
    --exclude='*__pycache__*' \
    --exclude='*.local' \
    --exclude='*.local.*' \
    --exclude='.venv' \
    --warning=no-file-changed .

echo -e "${BLUE}===> [3/8] Transferindo arquivos${NC}"
scp -i "$VM_KEY" "$DEPLOY_FILE" "${VM_USER}@${VM_HOST}:~/"

echo -e "${BLUE}===> [4/8] Preparando ambiente na VM${NC}"
# Detecta qual comando docker compose esta disponivel
COMPOSE_CMD="docker compose"
COMPOSE_FILE="-f docker-compose.yaml"
if ssh_exec "command -v docker-compose &>/dev/null"; then
    COMPOSE_CMD="docker-compose"
    COMPOSE_FILE="-f docker-compose.yaml"
elif ! ssh_exec "docker compose version &>/dev/null"; then
    echo -e "${YELLOW}   ATENCAO Docker Compose nao encontrado, tentando docker-compose...${NC}"
    COMPOSE_CMD="docker-compose"
    COMPOSE_FILE="-f docker-compose.yaml"
fi
echo -e "${GREEN}   Usando: $COMPOSE_CMD $COMPOSE_FILE${NC}"

ssh_exec "
    sudo mkdir -p /etc/eletrosil-certs
    
    if [ -d ~/$PROJECT_DIR ]; then
        cd ~/$PROJECT_DIR && $COMPOSE_CMD $COMPOSE_FILE down --remove-orphans 2>/dev/null || true
        rm -rf frontend/.next 2>/dev/null
        mv ~/$PROJECT_DIR ~/${PROJECT_DIR}_old_$DATE 2>/dev/null || true
    fi

    mkdir -p ~/$PROJECT_DIR
    echo '   Extraindo pacote...'
    tar xzf ~/$(basename $DEPLOY_FILE) -C ~/$PROJECT_DIR
    rm ~/$(basename $DEPLOY_FILE)
    ls ~/$PROJECT_DIR/docker-compose* 2>/dev/null && echo '   OK docker-compose.yaml encontrado' || echo '   ATENCAO docker-compose.yaml nao encontrado!'
"

echo -e "${BLUE}===> [5/8] Build e Startup${NC}"
ssh_exec "cd ~/$PROJECT_DIR && $COMPOSE_CMD $COMPOSE_FILE up --build -d 2>&1"

# ═══════════════════════════════════════════════════════════════════════════════
# [5b/8] Criacao das Bases de Dados (se nao existirem)
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}===> [5b/8] Garantindo que as bases existem${NC}"
ssh_exec "
    sleep 5
    # Cria eletrosil_db se nao existir
    docker exec -i $DB_CONTAINER psql -U $DB_USER -tc \"SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'\" | grep -q 1 || \
        docker exec -i $DB_CONTAINER createdb -U $DB_USER $DB_NAME
    # Cria emarques_db se nao existir
    docker exec -i $DB_CONTAINER psql -U $DB_USER -tc \"SELECT 1 FROM pg_database WHERE datname = '$DB_NAME_EMARQUES'\" | grep -q 1 || \
        docker exec -i $DB_CONTAINER createdb -U $DB_USER $DB_NAME_EMARQUES
    echo '   OK Bases verificadas/criadas'
" 2>/dev/null || echo -e "${YELLOW}   ATENCAO Nao foi possivel verificar as bases${NC}"

# ═══════════════════════════════════════════════════════════════════════════════
# [6/8] Migracao Fisica nos Bancos
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}===> [6/8] Migracao fisica nos bancos${NC}"

# Localizacao do arquivo de migracao (dentro de backend/)
MIGRATION_FILE="backend/migration_fisica.sql"

# Migracao no eletrosil_db
if ssh_exec "
    cd ~/$PROJECT_DIR
    [ -f $MIGRATION_FILE ] && docker exec -i $DB_CONTAINER psql -U $DB_USER $DB_NAME < $MIGRATION_FILE 2>/dev/null && echo 'OK' || echo 'FALHA'
" 2>/dev/null | grep -q 'OK'; then
    echo -e "${GREEN}   OK Constraints UNIQUE+CHECK em eletrosil_db${NC}"
else
    echo -e "${YELLOW}   ATENCAO Migration eletrosil_db pulada${NC}"
fi

# Migracao no emarques_db
if ssh_exec "
    cd ~/$PROJECT_DIR
    [ -f $MIGRATION_FILE ] && docker exec -i $DB_CONTAINER psql -U $DB_USER $DB_NAME_EMARQUES < $MIGRATION_FILE 2>/dev/null && echo 'OK' || echo 'FALHA'
" 2>/dev/null | grep -q 'OK'; then
    echo -e "${GREEN}   OK Constraints UNIQUE+CHECK em emarques_db${NC}"
else
    echo -e "${YELLOW}   ATENCAO Migration emarques_db pulada${NC}"
fi

echo -e "${BLUE}===> [7/8] Limpeza de imagens antigas${NC}"
ssh_exec "docker image prune -f"

echo -e "${BLUE}===> [8/8] Healthcheck${NC}"
sleep 15

ssh_exec "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null"
echo ""

ALL_OK=true
for DOMAIN in "${DOMAINS[@]}"; do
    echo -e "   Testando https://$DOMAIN ..."
    HTTP_CODE=$(ssh_exec "curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://$DOMAIN/api/health 2>/dev/null || echo '000'")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}   OK $DOMAIN ONLINE (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "${RED}   FALHA $DOMAIN FALHA (HTTP $HTTP_CODE)${NC}"
        ALL_OK=false
    fi
done

if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}"
    echo -e "================================================"
    echo -e "  DEPLOY CONCLUIDO!"
    echo -e "  https://eletrosil.top (eletrosil_db)"
    echo -e "  https://eletromarques.top (emarques_db)"
    echo -e "================================================"
    echo -e "${NC}"
else
    echo -e "${RED}Alguns dominios falharam. Verifique logs.${NC}"
fi

rm -f "$DEPLOY_FILE"