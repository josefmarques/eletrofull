#!/bin/bash

# --- CONFIGURAÇÕES DO BANCO ---
CONTAINER_NAME="diario-dev-postgres"
DB_NAME="estudos"
DB_USER="postgres"
BACKUP_DIR="/home/zemarques/diario-de-estudos/gerencia/backups-oci"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILE_NAME="$BACKUP_DIR/backup_local_${DB_NAME}_$DATE.sql"

mkdir -p $BACKUP_DIR

echo "--- Iniciando backup local do banco [$DB_NAME] ---"

docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME --clean --if-exists > "$FILE_NAME"

if [ -s "$FILE_NAME" ]; then
    echo "✅ Backup realizado com sucesso!"
    echo "Arquivo: $FILE_NAME"
    echo "Tamanho: $(du -h "$FILE_NAME" | cut -f1)"
else
    echo "❌ ERRO: O arquivo de backup está vazio. Verifique se o container está rodando."
    rm -f "$FILE_NAME"
    exit 1
fi

echo "--------------------------------------------------------"