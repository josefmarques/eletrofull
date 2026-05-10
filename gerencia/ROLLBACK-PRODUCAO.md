# Rollback de Deploy - Produção

Documentação para reverter um deploy de produção em caso de problemas.

## 📋 Estrutura de Backups

### Backups mantidos pelo script de deploy

```
/home/ubuntu/diario-de-estudos-prod.old.YYYYMMDD_HHMMSS/
├── Dockerfile
├── docker-compose.yml
├── package*.json
├── server.js
├── src/
├── public/
└── scripts/
```

### Backups do banco de dados

```
/home/ubuntu/backups-oci/
├── backup_pre_deploy_YYYYMMDD_HHMMSS.sql       # Antes do deploy
├── backup_prod_estudos_YYYYMMDD_HHMMSS.sql     # Backups agendados
└── backup_local_estudos_YYYYMMDD_HHMMSS.sql    # Backups manuais
```

## 🔄 Processo de Rollback Completo

### Passo 1: Identificar a versão anterior

Liste os backups disponíveis:

```bash
ssh -i ~/.ssh/ssh-key-2026-01-29.key ubuntu@159.112.179.76
ls -la /home/ubuntu/ | grep diario-de-estudos-prod.old
ls -la /home/ubuntu/backups-oci/ | grep backup
```

Exemplo de saída:
```
drwxr-xr-x 15 ubuntu ubuntu 4096 Apr  9 23:45 diario-de-estudos-prod.old.20260409_234510
-rw-r--r--  1 ubuntu ubuntu 123456 Apr  9 23:45 backup_pre_deploy_20260409_234510.sql
```

### Passo 2: Parar os containers atuais

```bash
cd /home/ubuntu/diario-de-estudos-prod
docker compose down
```

### Passo 3: Backup da versão atual (antes de reverter)

```bash
# Cria backup da versão que será substituída
cp -r /home/ubuntu/diario-de-estudos-prod /home/ubuntu/diario-de-estudos-prod.failed.$(date +%Y%m%d_%H%M%S)
```

### Passo 4: Restaurar os arquivos da versão anterior

```bash
# Substitua pela data/hora do backup desejado
DATA_BACKUP="20260409_234510"

# Remove a versão atual
rm -rf /home/ubuntu/diario-de-estudos-prod

# Restaura a versão anterior
cp -r /home/ubuntu/diario-de-estudos-prod.old.$DATA_BACKUP /home/ubuntu/diario-de-estudos-prod
cd /home/ubuntu/diario-de-estudos-prod
```

### Passo 5: Rebuild e subir containers (sem cache)

```bash
docker compose build --no-cache
docker compose up -d
```

### Passo 6: Restaurar o banco de dados (se necessário)

⚠️ **Atenção:** Só resta o banco se houver alterações no schema (migrations) ou dados corrompidos.

```bash
# Aguardar o PostgreSQL estar pronto
sleep 10

# Listar backups disponíveis
ls -lh /home/ubuntu/backups-oci/

# Restaurar o backup (substitua pelo nome do arquivo desejado)
docker exec -i diario-prod-postgres psql -U postgres -d estudos < /home/ubuntu/backups-oci/backup_pre_deploy_20260409_234510.sql
```

### Passo 7: Verificar saúde dos containers

```bash
docker ps
docker logs diario-prod-app --tail 50
```

Status esperado:
```
NAMES                  STATUS
diario-prod-app        Up XX seconds (healthy)
diario-prod-postgres   Up XX seconds (healthy)
```

### Passo 8: Testar a aplicação

Acesse: https://estudos.josemarques.com.br

- [ ] Homepage carrega
- [ ] Login funciona
- [ ] Dashboard funcional
- [ ] Revisões aparecem corretamente
- [ ] Criar nova sessão funciona

## 🎯 Rollback Rápido (apenas código, sem banco)

Se o problema for apenas no código (bug lógico, frontend, etc.) e o banco estiver OK:

```bash
ssh -i ~/.ssh/ssh-key-2026-01-29.key ubuntu@159.112.179.76

cd /home/ubuntu/diario-de-estudos-prod
docker compose down

# Substitua pela data/hora correta
DATA_BACKUP="20260409_234510"
rm -rf /home/ubuntu/diario-de-estudos-prod
cp -r /home/ubuntu/diario-de-estudos-prod.old.$DATA_BACKUP /home/ubuntu/diario-de-estudos-prod

cd /home/ubuntu/diario-de-estudos-prod
docker compose build --no-cache
docker compose up -d

# Aguardar health check
sleep 30
docker ps
```

## 🗑️ Rollback Apenas do Banco

Se precisar restaurar apenas o banco:

```bash
ssh -i ~/.ssh/ssh-key-2026-01-29.key ubuntu@159.112.179.76

# Listar backups
ls -lh /home/ubuntu/backups-oci/

# Restaurar
docker exec -i diario-prod-postgres psql -U postgres -d estudos < /home/ubuntu/backups-oci/backup_pre_deploy_YYYYMMDD_HHMMSS.sql
```

## 📊 Histórico de Deploys

| Data | Versão | Backup Arquivos | Backup Banco |
|------|--------|-----------------|--------------|
| 09/04/2026 23:45 | Correção fuso revisões + JWT 7d | `diario-de-estudos-prod.old.20260409_234510` | `backup_pre_deploy_20260409_234510.sql` |

## 🚨 Casos de Uso

### Caso 1: Bug no código
→ Rollback rápido (apenas código)

### Caso 2: Migration com erro
→ Rollback completo (código + banco)

### Caso 3: Dados corrompidos
→ Rollback apenas do banco

### Caso 4: Container não sobe
→ Verificar logs primeiro, pode ser problema de configuração

## 📞 Suporte

Em caso de dúvidas ou problemas durante o rollback:

1. Verificar logs: `docker logs diario-prod-app --tail 100`
2. Verificar logs do banco: `docker logs diario-prod-postgres --tail 100`
3. Verificar espaço em disco: `df -h`

## ⚠️ Importante

- **Sempre** faça backup antes de qualquer rollback
- **Nunca** delete backups antigos sem confirmar que está tudo funcionando
- **Teste** thoroughly após o rollback
- **Documente** o problema que causou o rollback para evitar recorrência
