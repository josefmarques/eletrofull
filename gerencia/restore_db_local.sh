#!/bin/bash

# --- CONFIGURAÇÕES LOCAL ---
CONTAINER_NAME="postgres-local"

# --- CONFIGURAÇÕES DO BANCO ---
DB_NAME="estoque-db"
DB_USER="zemarques"
BACKUP_DIR="$(dirname "$0")/backups-eletrosil"

# --- SELEÇÃO DO ARQUIVO ---
echo "=== Restore Local do Banco de Dados ===" 5q*q$01Xh40b8u
echo ""

# Lista os backups disponíveis
if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ ERRO: Pasta de backups não encontrada: $BACKUP_DIR"
    exit 1
fi

BACKUPS=$(ls -t $BACKUP_DIR/backup_prod_${DB_NAME}_*.sql 2>/dev/null)

if [ -z "$BACKUPS" ]; then
    echo "❌ ERRO: Nenhum arquivo de backup encontrado em $BACKUP_DIR"
    exit 1
fi

echo "Backups disponíveis:"
echo ""
i=1
while IFS= read -r backup; do
    filename=$(basename "$backup")
    size=$(du -h "$backup" | cut -f1)
    date=$(stat -c %y "$backup" 2>/dev/null | cut -d' ' -f1 || stat -f %Sm -t %Y-%m-%d "$backup" 2>/dev/null)
    echo "  [$i] $filename ($size)"
    backups_array[$i]="$backup"
    i=$((i+1))
done <<< "$BACKUPS"

echo ""
echo "  [0] Mais recente (primeiro da lista)"
echo ""

# Se foi passado um argumento, usa esse
if [ -n "$1" ]; then
    if [ "$1" = "0" ]; then
        SELECTED_BACKUP=$(echo "$BACKUPS" | head -1)
    else
        SELECTED_BACKUP="${backups_array[$1]}"
    fi
else
    read -p "Escolha o backup para restaurar [0]: " choice
    choice=${choice:-0}
    
    if [ "$choice" = "0" ]; then
        SELECTED_BACKUP=$(echo "$BACKUPS" | head -1)
    else
        SELECTED_BACKUP="${backups_array[$choice]}"
    fi
fi

if [ -z "$SELECTED_BACKUP" ]; then
    echo "❌ ERRO: Opção inválida"
    exit 1
fi

echo ""
echo "--- Restaurando: $(basename $SELECTED_BACKUP) ---"
echo "--- Container: [$CONTAINER_NAME] ---"
echo "--- ATENÇÃO: Todos os dados atuais serão substituídos! ---"
echo ""

# Confirmação
if [ -z "$1" ]; then
    read -p "Continuar? [s/N]: " confirm
    confirm=${confirm:-n}
    if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
        echo "Operação cancelada."
        exit 0
    fi
fi


# 1. Verifica se o container está rodando
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ ERRO: Container [$CONTAINER_NAME] não está em execução"
    exit 1
fi

echo "--- Iniciando limpeza e restore... ---"

# 2. Executa o restore com PRE-CLEAN (O segredo está aqui)
# Primeiro dropamos o schema public e criamos de novo para garantir que está limpo
# Depois injetamos o backup
(
  echo "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
  cat "$SELECTED_BACKUP"
) | docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME

# 3. Garante permissões (Correção de Case Sensitivity e Dono)
# Às vezes o restore traz as tabelas com dono diferente do seu usuário local
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"

# Verifica o status
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Restore finalizado com sucesso no banco [$DB_NAME]!"
    echo "--- As tabelas foram limpas e recriadas no schema public ---"
else
    echo ""
    echo "❌ ERRO: Ocorreu um problema durante o restore."
    exit 1
fi

echo "--------------------------------------------------------"