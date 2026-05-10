#!/bin/bash

# --- CONFIGURAÇÕES OCI ---
REMOTE_USER="eletrosil_hidraulica"
REMOTE_IP="34.151.221.3"
SSH_KEY="~/.ssh/gcp_eletrosil"
CONTAINER_NAME="postgres"

# --- CONFIGURAÇÕES DO BANCO ---
DB_NAME="estoque-db"
DB_USER="zemarques"
BACKUP_DIR="/home/zemarques/eletrosil-python/gerencia/backups-eletrosil"

# --- SELEÇÃO DO ARQUIVO ---
# Pega o backup mais recente da pasta (ou você pode definir o nome manualmente)
LATEST_BACKUP=$(ls -t $BACKUP_DIR/*${DB_NAME}_*.sql 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ ERRO: Nenhum arquivo de backup encontrado em $BACKUP_DIR"
    exit 1
fi

echo "--- Iniciando Restore do arquivo: $(basename $LATEST_BACKUP) ---"
echo "--- Destino: Container [$CONTAINER_NAME] na GCP ---"

# Executa o restore com o "Reset de Schema" para garantir que o Python veja as tabelas
(
  echo "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO $DB_USER;"
  cat "$LATEST_BACKUP"
) | ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_IP \
"docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME"

# Verifica o status da execução
if [ $? -eq 0 ]; then
    echo "✅ Restore finalizado com sucesso no banco [$DB_NAME]!"
else
    echo "❌ ERRO: Ocorreu um problema durante o restore."
    exit 1
fi

echo "--------------------------------------------------------"