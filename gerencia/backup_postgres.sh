#!/bin/bash

# --- CONFIGURAÇÕES OCI ---
REMOTE_USER="eletrosil_hidraulica"
REMOTE_IP="34.151.221.3"
SSH_KEY=" /home/zemarques/.ssh/gcp_eletrosil"
CONTAINER_NAME="postgres"

# --- CONFIGURAÇÕES DO BANCO ---
DB_NAME="estoque-db"
DB_USER="zemarques"
BACKUP_DIR="/home/zemarques/eletrosil-python/gerencia/backups-eletrosil"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILE_NAME="$BACKUP_DIR/backup_prod_${DB_NAME}_$DATE.sql"

# Cria a pasta de backups local no seu WSL
mkdir -p $BACKUP_DIR

echo "--- Iniciando backup remoto do banco [$DB_NAME] na GCP ---"

# Executa o dump via SSH e redireciona a saída para o arquivo local no seu WSL
ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_IP \
"docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME --clean --if-exists" > "$FILE_NAME"

# Verifica se o arquivo foi criado e não está vazio
if [ -s "$FILE_NAME" ]; then
    echo "✅ Backup realizado com sucesso e salvo no seu computador!"
    echo "Arquivo: $FILE_NAME"
    echo "Tamanho: $(du -h "$FILE_NAME" | cut -f1)"
else
    echo "❌ ERRO: O arquivo de backup está vazio. Verifique se o container está rodando na VM."
    rm -f "$FILE_NAME"
    exit 1
fi

echo "--------------------------------------------------------"