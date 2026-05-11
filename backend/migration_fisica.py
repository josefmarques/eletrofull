#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║ MIGRAÇÃO FÍSICA — Standalone Python                                        ║
║ Executa correções diretamente no PostgreSQL sem depender do FastAPI.        ║
║                                                                            ║
║ Uso:                                                                       ║
║   python backend/migration_fisica.py                                       ║
║   # ou pelo docker:                                                        ║
║   docker exec -i backend python /app/migration_fisica.py                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""
import os
import sys

# ── Lê DATABASE_URL do ambiente (mesma variável usada pelo docker-compose) ──
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://zemarques:mrq831028@db:5432/eletrosil_db",
)

# ── Conecta ao banco ──
try:
    from sqlalchemy import create_engine, text
except ImportError:
    print("❌ sqlalchemy não instalado. Execute: pip install sqlalchemy")
    sys.exit(1)

engine = create_engine(DATABASE_URL)


def migration():
    print(f"🔌 Conectado a: {DATABASE_URL}")
    print("=" * 60)

    with engine.connect() as conn:
        # ── 1. Normaliza strings vazias para NULL ──
        print("\n1/6 — Normalizando strings vazias em cpf_cnpj...")
        result = conn.execute(
            text(
                "UPDATE customers "
                "SET cpf_cnpj = NULL "
                "WHERE cpf_cnpj IS NOT NULL AND TRIM(cpf_cnpj) = ''"
            )
        )
        conn.commit()
        print(f"   ✅ {result.rowcount} registro(s) normalizado(s).")

        # ── 2. Remove duplicatas ──
        print("\n2/6 — Removendo CPFs duplicados...")
        result = conn.execute(
            text(
                "WITH ranked AS ("
                "  SELECT id, cpf_cnpj,"
                "    ROW_NUMBER() OVER ("
                "      PARTITION BY cpf_cnpj"
                "      ORDER BY created_at ASC NULLS LAST, name ASC, id ASC"
                "    ) AS rn"
                "  FROM customers"
                "  WHERE cpf_cnpj IS NOT NULL"
                ")"
                "DELETE FROM customers "
                "WHERE id IN (SELECT id FROM ranked WHERE rn > 1)"
            )
        )
        conn.commit()
        print(f"   ✅ {result.rowcount} duplicata(s) removida(s).")

        # ── 3. Drop constraints existentes ──
        print("\n3/6 — Removendo constraints UNIQUE antigas...")
        result = conn.execute(
            text(
                "SELECT conname FROM pg_constraint "
                "WHERE conrelid = 'customers'::regclass "
                "AND contype = 'u'"
            )
        )
        for row in result:
            conname = row[0]
            conn.execute(text(f"ALTER TABLE customers DROP CONSTRAINT {conname}"))
            conn.commit()
            print(f"   ✅ Constraint removida: {conname}")

        # ── 4. Cria a constraint UNIQUE ──
        print("\n4/6 — Criando constraint customers_cpf_cnpj_unique...")
        try:
            conn.execute(
                text(
                    "ALTER TABLE customers "
                    "ADD CONSTRAINT customers_cpf_cnpj_unique "
                    "UNIQUE (cpf_cnpj)"
                )
            )
            conn.commit()
            print("   ✅ Constraint criada com sucesso!")
        except Exception as e:
            conn.rollback()
            print(f"   ⚠️  Erro ao criar constraint: {e}")
            print("   Tentando abordagem alternativa...")
            # Tenta novamente com verificação mais rigorosa
            conn.execute(
                text(
                    "DO $$ "
                    "BEGIN "
                    "  IF NOT EXISTS ("
                    "    SELECT 1 FROM pg_constraint "
                    "    WHERE conrelid = 'customers'::regclass "
                    "    AND conname = 'customers_cpf_cnpj_unique'"
                    "  ) THEN "
                    "    EXECUTE 'ALTER TABLE customers "
                    "      ADD CONSTRAINT customers_cpf_cnpj_unique "
                    "      UNIQUE (cpf_cnpj)'; "
                    "  END IF; "
                    "END $$;"
                )
            )
            conn.commit()
            print("   ✅ Constraint criada via DO block!")

        # ── 5. Verifica branch_id ──
        print("\n5/6 — Verificando se customers é global (sem branch_id)...")
        result = conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'customers' AND column_name = 'branch_id'"
            )
        )
        if result.fetchone():
            print("   ⚠️  customers TEM branch_id! Removendo...")
            conn.execute(text("ALTER TABLE customers DROP COLUMN branch_id"))
            conn.commit()
            print("   ✅ Coluna branch_id removida.")
        else:
            print("   ✅ customers NÃO tem branch_id (correto — tabela global).")

        # ── 6. Configura timezone no banco ──
        print("\n6/6 — Configurando timezone do banco...")
        conn.execute(text("ALTER DATABASE CURRENT SET timezone TO 'America/Sao_Paulo'"))
        conn.commit()
        print("   ✅ Timezone configurado: America/Sao_Paulo.")

        # ── Relatório Final ──
        print("\n" + "=" * 60)
        print("📊 RELATÓRIO FINAL")

        # Verifica constraint
        result = conn.execute(
            text(
                "SELECT conname FROM pg_constraint "
                "WHERE conrelid = 'customers'::regclass "
                "AND conname = 'customers_cpf_cnpj_unique'"
            )
        )
        if result.fetchone():
            print("   ✅ UNIQUE constraint: ATIVA")
        else:
            print("   ❌ UNIQUE constraint: AUSENTE")

        # Verifica timezone
        result = conn.execute(text("SHOW timezone"))
        tz = result.fetchone()[0]
        print(f"   ✅ Timezone: {tz}")

        # Verifica duplicatas restantes
        result = conn.execute(
            text(
                "SELECT cpf_cnpj, COUNT(*) FROM customers "
                "WHERE cpf_cnpj IS NOT NULL "
                "GROUP BY cpf_cnpj HAVING COUNT(*) > 1"
            )
        )
        remaining = result.fetchall()
        if remaining:
            print(f"   ❌ AINDA EXISTEM {len(remaining)} CPFs duplicados!")
            for row in remaining:
                print(f"      CPF: {row[0]} — {row[1]} ocorrências")
        else:
            print("   ✅ Nenhum CPF duplicado encontrado.")

        print("\n✅ MIGRAÇÃO CONCLUÍDA!")
        print("=" * 60)


if __name__ == "__main__":
    migration()
