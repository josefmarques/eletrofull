-- 1. Limpeza de segurança (caso existam strings vazias)
UPDATE customers SET cpf_cnpj = NULL WHERE cpf_cnpj = '' OR cpf_cnpj IS NULL;

-- 2. Aplicação das travas físicas
ALTER TABLE customers DROP CONSTRAINT IF EXISTS unique_cpf_cnpj;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS cpf_not_empty;

-- Garante que não existam CPFs vazios (apenas NULL ou preenchido)
ALTER TABLE customers ADD CONSTRAINT cpf_not_empty CHECK (cpf_cnpj <> '');

-- Garante que o CPF seja único em toda a rede
ALTER TABLE customers ADD CONSTRAINT unique_cpf_cnpj UNIQUE (cpf_cnpj);

-- 3. Ajuste Global de Timezone em Ambos os Bancos
ALTER DATABASE "eletrosil_db" SET timezone TO 'America/Sao_Paulo';
ALTER DATABASE "emarques_db" SET timezone TO 'America/Sao_Paulo';

-- 4. Garantia de que a tabela de clientes é global (sem branch_id)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='branch_id') THEN
        ALTER TABLE customers DROP COLUMN branch_id;
    END IF;
END $$;