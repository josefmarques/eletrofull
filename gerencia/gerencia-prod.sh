#!/bin/bash

# --- CONFIGURAÇÕES PARA EXECUÇÃO LOCAL APONTANDO PARA VM ---
VM_USER="ubuntu"
VM_HOST="159.112.179.76"
VM_KEY="${HOME}/.ssh/ssh-key-2026-01-29.key"

# Nomes dos containers na VM (produção)
DB_CONTAINER="diario-prod-postgres"
APP_CONTAINER="diario-prod-app"
DB_NAME="estudos"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Função para executar comando na VM via SSH
ssh_exec() {
    ssh -i "$VM_KEY" -o StrictHostKeyChecking=no "${VM_USER}@${VM_HOST}" "$@"
}

# Função para executar docker exec na VM
docker_exec_db() {
    ssh_exec "docker exec $DB_CONTAINER $@"
}

docker_exec_app() {
    ssh_exec "docker exec $APP_CONTAINER $@"
}

# Testar conexão com a VM antes de iniciar
echo -e "${YELLOW}Testando conexão com a VM...${NC}"
if ! ssh_exec "echo 'Conexão OK'" > /dev/null 2>&1; then
    echo -e "${RED}❌ Erro: Não foi possível conectar à VM ${VM_USER}@${VM_HOST}${NC}"
    echo -e "${RED}   Verifique se a chave SSH existe em: $VM_KEY${NC}"
    echo -e "${RED}   E se a VM está acessível.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Conexão com VM estabelecida!${NC}"
sleep 1

while true; do
    clear
    echo "================================================"
    echo "   DASHBOARD DE ADMINISTRAÇÃO - PRODUÇÃO (VM)   "
    echo "   Conectado em: ${VM_HOST}"
    echo "================================================"
    echo "1. Listar usuários"
    echo "2. Ver registros de um usuário (Disciplinas)"
    echo "3. Estatísticas rápidas (Total de registros)"
    echo "4. Aprovar um usuário"
    echo "5. RESETAR SENHA (Bcrypt)"
    echo "6. Ver Logs da aplicação"
    echo "7. Deletar um usuário ⚠️"
    echo "8. Sair"
    echo "================================================"
    echo -n "Escolha uma opção: "
    read opcao

    case $opcao in
        1)
            docker_exec_db "psql -U postgres -d $DB_NAME -c \"SELECT id, username, aprovado, is_admin FROM usuarios ORDER BY id;\""
            ;;
        2)
            echo -n "🔍 Digite o username para ver o histórico: "
            read user_hist
            echo -e "\n--- Histórico de Estudos para: $user_hist ---"
            docker_exec_db "psql -U postgres -d $DB_NAME -c \"
            SELECT
                to_char(r.data, 'DD/MM/YYYY') as data,
                r.disciplina,
                r.tempo_estudado,
                r.descricao
            FROM registros r
            JOIN usuarios u ON r.usuario_id = u.id
            WHERE u.username = '$user_hist'
            ORDER BY r.data DESC, r.id DESC
            LIMIT 20;\""
            ;;
        3)
            echo -e "\n📊 Resumo Geral do Sistema:"
            docker_exec_db "psql -U postgres -d $DB_NAME -c \"
            SELECT
                (SELECT count(*) FROM usuarios) as total_usuarios,
                (SELECT count(*) FROM usuarios WHERE aprovado = true) as usuarios_aprovados,
                (SELECT count(*) FROM registros) as total_registros,
                (SELECT count(*) FROM sessoes) as total_sessoes,
                (SELECT count(*) FROM editais_usuarios) as total_editais
            FROM usuarios
            LIMIT 1;\""
            ;;
        4)
            echo -n "👉 Username para aprovar: "
            read user_to_approve
            docker_exec_db "psql -U postgres -d $DB_NAME -c \"UPDATE usuarios SET aprovado = true WHERE username = '\$user_to_approve';\""
            echo -e "\n${GREEN}✅ Usuário $user_to_approve aprovado!${NC}"
            ;;
        5)
            echo -e "${YELLOW}🔑 RESET DE SENHA${NC}"
            echo -n "Username: "
            read user_to_reset
            echo -n "Nova Senha: "
            read -s new_password
            echo
            # Gerar hash usando node no container
            HASHED_PW=$(docker_exec_app "node -e \"console.log(require('bcryptjs').hashSync('\$new_password', 10))\"")

            if [ -z "$HASHED_PW" ]; then
                echo -e "${RED}❌ Erro ao gerar hash${NC}"
            else
                docker_exec_db "psql -U postgres -d $DB_NAME -c \"UPDATE usuarios SET password = '\$HASHED_PW' WHERE username = '\$user_to_reset';\""
                echo -e "${GREEN}✅ Senha de $user_to_reset atualizada!${NC}"
            fi
            ;;
        6)
            echo -e "\n📋 Logs da aplicação (últimas 30 linhas):"
            ssh_exec "docker logs --tail 30 $APP_CONTAINER"
            ;;
        7)
            echo -e "\n${RED}⚠️  DELETAR USUÁRIO${NC}"
            echo -n "Username para DELETAR: "
            read user_to_delete
            echo -n "Tem certeza? (s/n): "
            read confirma
            if [ "$confirma" = "s" ]; then
                # Primeiro deletar dados relacionados
                docker_exec_db "psql -U postgres -d $DB_NAME -c \"
                DELETE FROM progresso_itens WHERE usuario_id = (SELECT id FROM usuarios WHERE username = '\$user_to_delete');
                DELETE FROM editais_usuarios WHERE usuario_id = (SELECT id FROM usuarios WHERE username = '\$user_to_delete');
                DELETE FROM sessoes WHERE usuario_id = (SELECT id FROM usuarios WHERE username = '\$user_to_delete');
                DELETE FROM disciplinas WHERE usuario_id = (SELECT id FROM usuarios WHERE username = '\$user_to_delete');
                DELETE FROM metas WHERE usuario_id = (SELECT id FROM usuarios WHERE username = '\$user_to_delete');
                DELETE FROM registros WHERE usuario_id = (SELECT id FROM usuarios WHERE username = '\$user_to_delete');
                DELETE FROM usuarios WHERE username = '\$user_to_delete';
                \""
                echo -e "${GREEN}🗑️ Usuário $user_to_delete removido.${NC}"
            else
                echo "Cancelado."
            fi
            ;;
        8)
            echo "Saindo..."
            exit 0
            ;;
        *)
            echo -e "${RED}Opção inválida!${NC}"
            ;;
    esac

    echo -e "\nPressione [ENTER] para voltar ao menu..."
    read
done
