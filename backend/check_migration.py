"""Verifica o status da migração"""
from app.core.database import engine, init_db
from sqlmodel import text

# Executa a migração
init_db()

# Verifica se a coluna existe
with engine.connect() as conn:
    r = conn.execute(
        text("SELECT column_name FROM information_schema.columns WHERE table_name='sales' AND column_name='receipt_number'")
    )
    if r.fetchone():
        print("MIGRATION_OK")
    else:
        print("MIGRATION_FAILED")
    
    # Testa criação de uma venda
    from app.models.sales import Sale
    from decimal import Decimal
    from uuid import uuid4
    
    test_sale = Sale(
        id=uuid4(),
        branch_id=uuid4(),
        user_id=uuid4(),
        gross_value=Decimal("10"),
        discount=Decimal("0"),
        total_value=Decimal("10"),
        payment_method="cash",
        payment_status="completed",
    )
    conn.add(test_sale)
    conn.commit()
    print(f"INSERT_OK: receipt_number={test_sale.receipt_number}")
    conn.close()
