-- ============================================================================
-- init-multiple-dbs.sql
-- Cria bancos de dados para o modelo Multi-Tenant (single Postgres server).
--
-- ═══════════════════════════════════════════════════════════════════════════
-- IMPORTANTE: Este script roda APENAS na primeira inicialização do container
-- (quando o volume postgres_data_local está vazio).
-- Em deploys subsequentes com volume persistente, o deploy-producao.sh
-- também verifica/cria as bases.
-- ═══════════════════════════════════════════════════════════════════════════
-- ============================================================================

-- ══════════════════════════════════════════════════════════════════════════
-- 1. CRIAÇÃO DOS BANCOS (se não existirem)
-- ══════════════════════════════════════════════════════════════════════════
SELECT 'CREATE DATABASE eletrosil_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'eletrosil_db')\gexec

SELECT 'CREATE DATABASE emarques_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'emarques_db')\gexec

-- ══════════════════════════════════════════════════════════════════════════
-- 2. CONFIGURAÇÃO DE TIMEZONE (America/Sao_Paulo) EM AMBAS AS BASES
-- ══════════════════════════════════════════════════════════════════════════
-- Garante que qualquer nova sessão use o fuso brasileiro por padrão.
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_database WHERE datname = 'eletrosil_db') THEN
        EXECUTE 'ALTER DATABASE eletrosil_db SET timezone TO ''America/Sao_Paulo'' ';
    END IF;

    IF EXISTS (SELECT FROM pg_database WHERE datname = 'emarques_db') THEN
        EXECUTE 'ALTER DATABASE emarques_db SET timezone TO ''America/Sao_Paulo'' ';
    END IF;
END
$$;
