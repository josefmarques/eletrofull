from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func, text
from uuid import UUID
from typing import Optional
from datetime import datetime, date, timedelta

from decimal import Decimal

from app.core.database import get_session
from app.models.products import Product
from app.models.stocks import Stock
from app.models.moves import Move
from app.models.categories import Category
from app.models.enums import MoveType
from app.api.dependencies import require_manager, verify_branch_access
from app.models.users import User

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/inventory-value")
def get_inventory_value(
    branchId: Optional[UUID] = Query(None, alias="branchId"),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_manager),
):
    """
    Retorna o valor financeiro total do estoque (soma de quantity * unit_price)
    e a contagem de itens distintos em estoque.
    Permite filtrar por branch_id.

    Acesso: admin | manager (com isolamento multi-filial).
    """
    # ── Isolamento Multi-Filial ──
    verify_branch_access(current_user, branchId)
    # Query para o valor total
    value_query = (
        select(func.sum(Stock.quantity * Product.unit_price))
        .join(Product, Stock.product_id == Product.id)
        .where(Product.deleted_at.is_(None))
    )
    # Query para a contagem de produtos distintos
    count_query = (
        select(func.count(func.distinct(Stock.product_id)))
        .join(Product, Stock.product_id == Product.id)
        .where(Product.deleted_at.is_(None))
        .where(Stock.quantity > 0)
    )

    if branchId:
        value_query = value_query.where(Stock.branch_id == branchId)
        count_query = count_query.where(Stock.branch_id == branchId)

    total = session.exec(value_query).one()
    total_value = int(total) if total else 0

    total_items = session.exec(count_query).one()
    total_items_count = int(total_items) if total_items else 0

    return {
        "error": None,
        "data": {
            "totalValue": total_value,
            "totalItems": total_items_count,
        },
    }


@router.get("/dashboard/moves-summary")
def get_moves_summary(
    startDate: Optional[str] = Query(None, alias="startDate"),
    endDate: Optional[str] = Query(None, alias="endDate"),
    branchId: Optional[UUID] = Query(None, alias="branchId"),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_manager),
):
    """
    Retorna resumo de movimentações (entradas e saídas) em um período.

    Acesso: admin | manager (com isolamento multi-filial).
    """
    # ── Isolamento Multi-Filial ──
    verify_branch_access(current_user, branchId)
    result = {"in": {"value": 0, "count": 0}, "out": {"value": 0, "count": 0}}

    for move_type in [MoveType.IN, MoveType.OUT]:
        query = select(
            func.count(Move.id),
            func.sum(Move.quantity * Move.unit_price),
        ).where(Move.type == move_type)

        if startDate:
            try:
                dt = datetime.fromisoformat(startDate)
                query = query.where(Move.created_at >= dt)
            except ValueError:
                pass

        if endDate:
            try:
                dt = datetime.fromisoformat(endDate)
                query = query.where(Move.created_at <= dt)
            except ValueError:
                pass

        if branchId:
            query = query.where(Move.branch_id == branchId)

        row = session.exec(query).one()
        count = row[0] if row[0] else 0
        value = int(row[1]) if row[1] else 0

        key = "in" if move_type == MoveType.IN else "out"
        result[key] = {"value": value, "count": count}

    return {"error": None, "data": result}


@router.get("/dashboard/moves-graph")
def get_moves_graph(
    startDate: Optional[str] = Query(None, alias="startDate"),
    endDate: Optional[str] = Query(None, alias="endDate"),
    branchId: Optional[UUID] = Query(None, alias="branchId"),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_manager),
):
    """
    Retorna movimentações (Entradas vs Saídas) agrupadas por dia.
    Formato ideal para gráficos: [{date: '2025-05-02', in: 1500, out: 300}]
    Se nenhuma data for informada, retorna os últimos 7 dias.

    Acesso: admin | manager (com isolamento multi-filial).
    """
    # ── Isolamento Multi-Filial ──
    verify_branch_access(current_user, branchId)
    now = datetime.now()

    # Se nenhuma data foi informada, padrão = últimos 7 dias
    if not startDate:
        seven_days_ago = now - timedelta(days=6)
        dt_start = seven_days_ago.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        try:
            dt_start = datetime.fromisoformat(startDate)
        except ValueError:
            dt_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    if not endDate:
        dt_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    else:
        try:
            dt_end = datetime.fromisoformat(endDate)
        except ValueError:
            dt_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    # Query de ENTRADAS agrupadas por dia
    in_query = (
        select(
            func.date(Move.created_at).label("date"),
            func.sum(Move.quantity * Move.unit_price).label("total_in"),
        )
        .where(Move.type == MoveType.IN)
        .where(Move.created_at >= dt_start)
        .where(Move.created_at <= dt_end)
        .group_by(func.date(Move.created_at))
        .order_by(func.date(Move.created_at))
    )

    # Query de SAÍDAS agrupadas por dia
    out_query = (
        select(
            func.date(Move.created_at).label("date"),
            func.sum(Move.quantity * Move.unit_price).label("total_out"),
        )
        .where(Move.type == MoveType.OUT)
        .where(Move.created_at >= dt_start)
        .where(Move.created_at <= dt_end)
        .group_by(func.date(Move.created_at))
        .order_by(func.date(Move.created_at))
    )

    if branchId:
        in_query = in_query.where(Move.branch_id == branchId)
        out_query = out_query.where(Move.branch_id == branchId)

    in_rows = session.exec(in_query).all()
    out_rows = session.exec(out_query).all()

    # Monta dicionários para lookup rápido
    in_map: dict[str, int] = {}
    for row in in_rows:
        day = row[0]
        total = int(row[1]) if row[1] else 0
        date_str = day.isoformat() if isinstance(day, (date, datetime)) else str(day)
        in_map[date_str] = total

    out_map: dict[str, int] = {}
    for row in out_rows:
        day = row[0]
        total = int(row[1]) if row[1] else 0
        date_str = day.isoformat() if isinstance(day, (date, datetime)) else str(day)
        out_map[date_str] = total

    # Preenche todos os dias do período (garantindo que dias sem movimento também apareçam)
    result = []
    current = dt_start.date()
    end = dt_end.date()

    while current <= end:
        date_str = current.isoformat()
        result.append({
            "date": date_str,
            "in": in_map.get(date_str, 0),
            "out": out_map.get(date_str, 0),
        })
        current += timedelta(days=1)

    return {"error": None, "data": result}


@router.get("/dashboard/low-stock")
def get_low_stock(
    branchId: Optional[UUID] = Query(None, alias="branchId"),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_manager),
):
    """
    Lista produtos onde a quantidade em estoque é MENOR OU IGUAL à
    minimum_quantity (estoque crítico).

    Inclui o valor financeiro parado (unit_price * quantity) para priorização.
    Retorna ordenado do mais crítico (menor saldo%) para o menos crítico.

    Acesso: admin | manager (com isolamento multi-filial).
    """
    # ── Isolamento Multi-Filial ──
    verify_branch_access(current_user, branchId)
    stock_query = (
        select(
            Stock,
            Product,
            Category,
        )
        .join(Product, Stock.product_id == Product.id)
        .join(Category, Product.category_id == Category.id, isouter=True)
        .where(Product.deleted_at.is_(None))
        .where(Stock.minimum_quantity > 0)
        .where(Stock.quantity <= Stock.minimum_quantity)
        .order_by(Stock.quantity.asc())
    )

    if branchId:
        stock_query = stock_query.where(Stock.branch_id == branchId)
    
    rows = session.exec(stock_query).all()

    result = []
    for stock, product, category in rows:
        category_name = category.name if category else ""
        qty = stock.quantity
        min_qty = stock.minimum_quantity
        # Calcula o percentual do saldo em relação ao mínimo (0% = zerado, 100% = no mínimo)
        if min_qty > 0:
            pct = int(float(qty) / float(min_qty) * 100)
        else:
            pct = 0

        money_at_risk = int(qty * product.unit_price)

        result.append({
            "id": str(product.id),
            "name": product.name,
            "categoryId": str(product.category_id),
            "categoryName": category_name,
            "unitPrice": product.unit_price,
            "unitType": product.unit_type.value if hasattr(product.unit_type, "value") else str(product.unit_type),
            "quantity": str(qty),
            "minimumQuantity": str(min_qty),
            "maximumQuantity": str(stock.maximum_quantity),
            "stockPct": pct,
            "moneyAtRisk": money_at_risk,
            "createdAt": product.created_at.isoformat() if product.created_at else None,
            "updatedAt": product.updated_at.isoformat() if product.updated_at else None,
        })

    return {"error": None, "data": result}


@router.get("/dashboard/stagnant-products")
def get_stagnant_products(
    startDate: Optional[str] = Query(None, alias="startDate"),
    endDate: Optional[str] = Query(None, alias="endDate"),
    branchId: Optional[UUID] = Query(None, alias="branchId"),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_manager),
):
    """
    Retorna produtos que não tiveram NENHUMA movimentação (nem entrada, nem saída)
    nos últimos 30 dias (padrão) mas que possuem saldo > 0 no Stock.

    Se startDate/endDate forem fornecidos, usa o período informado.
    Inclui o valor financeiro parado para priorização (dinheiro parado na prateleira).

    Acesso: admin | manager (com isolamento multi-filial).
    """
    # ── Isolamento Multi-Filial ──
    verify_branch_access(current_user, branchId)
    now = datetime.now()

    if not startDate:
                dt_start = (now - timedelta(days=30)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
    else:
        try:
            dt_start = datetime.fromisoformat(startDate)
        except ValueError:
            dt_start = (now - timedelta(days=30)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )

    if not endDate:
        dt_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    else:
        try:
            dt_end = datetime.fromisoformat(endDate)
        except ValueError:
            dt_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    # Subquery: produtos que tiveram QUALQUER movimentação no período
    has_moves_subquery = select(Move.product_id).where(
        Move.created_at >= dt_start,
        Move.created_at <= dt_end,
    )

    if branchId:
        has_moves_subquery = has_moves_subquery.where(Move.branch_id == branchId)

    has_moves_subquery = has_moves_subquery.distinct().subquery()

    # Produtos com saldo > 0 que NÃO estão na subquery (não tiveram movimentos)
    query = (
        select(
            Product,
            Category,
            func.sum(Stock.quantity).label("quantity"),
            func.sum(Stock.minimum_quantity).label("minimumQuantity"),
            func.sum(Stock.maximum_quantity).label("maximumQuantity"),
        )
        .join(Stock, Stock.product_id == Product.id)
        .join(Category, Category.id == Product.category_id, isouter=True)
        .where(
            Product.deleted_at.is_(None),
            Stock.quantity > 0,
            Product.id.not_in(select(has_moves_subquery.c.product_id)),
        )
    )

    if branchId:
        query = query.where(Stock.branch_id == branchId)

    query = query.group_by(Product.id, Category.id).order_by(Product.name)

    rows = session.exec(query).all()

    result = []
    for product, category, quantity, minimum_quantity, maximum_quantity in rows:
        qty = quantity or 0
        frozen_money = int(qty * product.unit_price)

        result.append({
            "id": str(product.id),
            "name": product.name,
            "categoryId": str(product.category_id),
            "categoryName": category.name if category else "",
            "unitPrice": product.unit_price,
            "unitType": product.unit_type.value if hasattr(product.unit_type, "value") else str(product.unit_type),
            "quantity": str(qty),
            "minimumQuantity": str(minimum_quantity or 0),
            "maximumQuantity": str(maximum_quantity or 0),
            "frozenMoney": frozen_money,
            "createdAt": product.created_at.isoformat() if product.created_at else None,
            "updatedAt": product.updated_at.isoformat() if product.updated_at else None,
        })

    return {"error": None, "data": result}
