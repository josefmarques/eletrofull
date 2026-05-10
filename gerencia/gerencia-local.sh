#!/bin/bash

# --- CONFIGURAÇÕES LOCAIS (DOCKER) ---
DB_CONTAINER="diario-dev-postgres"
APP_CONTAINER="diario-dev-app"
DB_NAME="estudos"
DB_USER="postgres"

# Verifica se o Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Erro: Docker não encontrado ou não está rodando."
    exit 1
fi

while true; do
    echo "------------------------------------------------"
    echo "   DASHBOARD DE ADMINISTRAÇÃO - LOCAL (DOCKER) "
    echo "------------------------------------------------"
    echo "1. Listar usuários"
    echo "2. Ver registros de um usuário (Disciplinas)"
    echo "3. Estatísticas rápidas (Total de registros)"
    echo "4. Aprovar um usuário"
    echo "5. RESETAR SENHA (Bcrypt)"
    echo "6. Ver Logs da aplicação"
    echo "7. Deletar um usuário ⚠️"
    echo "8. Sair"
    echo "------------------------------------------------"
    echo -n "Escolha uma opção: "
    read opcao

    case $opcao in
        1)
            docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c 'SELECT id, username, aprovado FROM usuarios ORDER BY id;'
            ;;
        2)
            echo -n "🔍 Digite o username para ver o histórico: "
            read user_hist
            echo "--- Histórico de Estudos para: $user_hist ---"
            docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
            SELECT 
                r.data, 
                r.disciplina, 
                r.tempo_estudado, 
                r.descricao 
            FROM registros r 
            JOIN usuarios u ON r.usuario_id = u.id 
            WHERE u.username = '$user_hist' 
            ORDER BY r.data DESC, r.id DESC;"
            ;;
        3)
            echo "📊 Resumo Geral do Sistema:"
            docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
            SELECT 
                (SELECT count(*) FROM usuarios) as total_users,
                (SELECT count(*) FROM registros) as total_registros;"
            ;;
        4)
            echo -n "👉 Username para aprovar: "
            read user_to_approve
            docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "UPDATE usuarios SET aprovado = TRUE WHERE username = '$user_to_approve';"
            echo "✅ Usuário $user_to_approve aprovado!"
            ;;
        5)
            echo -n "🔑 Username para resetar: "
            read user_to_reset
            echo -n "Nova Senha: "
            read -s new_password
            echo ""
            # Executa o node dentro do container da aplicação para gerar o hash
            HASHED_PW=$(docker exec $APP_CONTAINER node -e "console.log(require('bcryptjs').hashSync('$new_password', 10))")

            if [ -z "$HASHED_PW" ]; then
                echo "❌ Erro ao gerar hash no container $APP_CONTAINER."
            else
                docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "UPDATE usuarios SET password = '$HASHED_PW' WHERE username = '$user_to_reset';"
                echo "✅ Senha de $user_to_reset atualizada!"
            fi
            ;;
        6)
            docker logs --tail 30 $APP_CONTAINER
            ;;
        7)
            echo -n "⚠️ Username para DELETAR: "
            read user_to_delete
            echo -n "Tem certeza? (s/n): "
            read confirma
            if [ "$confirma" = "s" ]; then
                docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "DELETE FROM usuarios WHERE username = '$user_to_delete';"
                echo "🗑️ Usuário removido."
            fi
            ;;
        8) exit 0 ;;
        *) echo "Opção inválida!" ;;
    esac
    echo -e "\nPressione [ENTER] para voltar ao menu..."
    read
done
