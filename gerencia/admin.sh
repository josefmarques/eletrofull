#!/bin/bash

# --- CONFIGURAÇÕES OCI ---
REMOTE_USER="ubuntu"
REMOTE_IP="168.138.238.72"
SSH_KEY="~/.ssh/ssh-key-2026-01-29.key"
DB_CONTAINER="diario-db"
APP_CONTAINER="diario-app"  # Nome do container onde roda o Node.js

# Atalho para comando SSH
SSH_CMD="ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_IP"

echo "------------------------------------------------"
echo "   GERENCIADOR DE USUÁRIOS - OCI (DOCKER)"
echo "------------------------------------------------"
echo "1. Listar usuários"
echo "2. Aprovar um usuário"
echo "3. RESETAR SENHA (BCRYPT COMPATÍVEL)"
echo "4. Deletar um usuário"
echo "5. Sair"
echo -n "Escolha uma opção: "
read opcao

case $opcao in
    1)
        $SSH_CMD "docker exec $DB_CONTAINER psql -U postgres -d estudos -c 'SELECT id, username, aprovado FROM usuarios ORDER BY id;'"
        ;;
    2)
        echo -n "👉 Username para aprovar: "
        read user_to_approve
        $SSH_CMD "docker exec $DB_CONTAINER psql -U postgres -d estudos -c \"UPDATE usuarios SET aprovado = TRUE WHERE username = '$user_to_approve';\""
        echo "✅ Usuário $user_to_approve aprovado!"
        ;;
    3)
        echo -n "🔑 Username para resetar: "
        read user_to_reset
        echo -n "Nova Senha: "
        read -s new_password
        echo ""

        # Gera o hash usando o node dentro do container da aplicação na OCI
        HASHED_PW=$($SSH_CMD "docker exec $APP_CONTAINER node -e \"console.log(require('bcryptjs').hashSync('$new_password', 10))\"")

        if [ -z "$HASHED_PW" ]; then
            echo "❌ Erro ao gerar hash. Verifique se o container $APP_CONTAINER está rodando."
        else
            $SSH_CMD "docker exec $DB_CONTAINER psql -U postgres -d estudos -c \"UPDATE usuarios SET password = '$HASHED_PW' WHERE username = '$user_to_reset';\""
            echo "✅ Senha de $user_to_reset atualizada com sucesso!"
        fi
        ;;
    4)
        echo -n "⚠️ Username para DELETAR: "
        read user_to_delete
        $SSH_CMD "docker exec $DB_CONTAINER psql -U postgres -d estudos -c \"DELETE FROM usuarios WHERE username = '$user_to_delete';\""
        echo "🗑️ Usuário removido."
        ;;
    5) exit 0 ;;
esac