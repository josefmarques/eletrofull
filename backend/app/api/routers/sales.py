from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from pydantic import BaseModel
from uuid import UUID
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.core.database import get_session
from app.models.sales import Sale
from app.models.sale_items import SaleItem
from app.models.products import Product
from app.models.stocks import Stock
from app.models.customers import Customer
from app.models.moves import Move
from app.models.enums import MoveType, PaymentMethod
from app.models.payments import Payment
from app.api.dependencies import get_current_user
from app.models.users import User

router = APIRouter(tags=["sales"])


# ─── Helper ──────────────────────────────────────────────────────────────────


def _get_sale_names(sale: Sale, session: Session) -> dict:
    """Retorna userName e customerName para uma venda."""
    user_name = None
    customer_name = None

    user = session.get(User, sale.user_id)
    if user:
        user_name = user.name

    if sale.customer_id:
        customer = session.get(Customer, sale.customer_id)
        if customer:
            customer_name = customer.name

    return {
        "userName": user_name,
        "customerName": customer_name,
    }


# ─── Schemas ─────────────────────────────────────────────────────────────────


class PaymentPayload(BaseModel):
    """Payload de um pagamento individual."""
    method: PaymentMethod
    amount: str | int | float  # Aceita string, int ou float do frontend


class SaleItemPayload(BaseModel):
    productId: UUID
    quantity: int
    unitPrice: str | int | float
    subtotal: str | int | float
    name: Optional[str] = None


class SaleCreate(BaseModel):
    branchId: Optional[UUID] = None  # Para Admin Global informar a filial
    customerId: Optional[UUID] = None
    grossValue: str | int | float
    totalValue: str | int | float
    discount: str | int | float = "0.00"
    paymentMethod: Optional[str] = "cash"  # Mantido para compatibilidade, usado apenas se payments não for enviado
    payments: Optional[List[PaymentPayload]] = None  # Novo: múltiplos pagamentos
    items: List[SaleItemPayload]


# ─── Schema específico para PDV (POST /sales/checkout) ───────────────────


class PDVCheckoutItem(BaseModel):
    """Item individual para o checkout do PDV."""
    product_id: UUID
    quantity: int
    unit_price: str | int | float


class PDVCheckoutPayload(BaseModel):
    """Payload simplificado para o PDV (Frente de Caixa Rápida).
    
    O backend calcula automaticamente:
    - gross_value (soma dos subtotais dos itens)
    - total_value (gross_value - discount_amount)
    - Cria os registros de SaleItem com subtotal calculado
    """
    branch_id: UUID
    payment_method: str  # PIX, CREDIT, DEBIT, CASH (mapeado para PaymentMethod)
    discount_amount: str | int | float = "0.00"
    items: List[PDVCheckoutItem]


# ─── Endpoints ───────────────────────────────────────────────────────────────


@router.get("/sales")
def list_sales(
    branchId: Optional[UUID] = Query(None, alias="branchId"),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Lista vendas realizadas."""
    query = select(Sale).order_by(Sale.created_at.desc())

    if branchId:
        query = query.where(Sale.branch_id == branchId)

    query = query.offset(offset).limit(limit)
    sales = session.exec(query).all()

    result = []
    for sale in sales:
        # Busca os itens da venda
        items = session.exec(
            select(SaleItem, Product.name)
            .join(Product, SaleItem.product_id == Product.id)
            .where(SaleItem.sale_id == sale.id)
        ).all()

        items_data = []
        for item, product_name in items:
            items_data.append({
                "id": str(item.id),
                "saleId": str(item.sale_id),
                "productId": str(item.product_id),
                "productName": product_name,
                "quantity": item.quantity,
                "unitPrice": str(item.unit_price),
                "subtotal": str(item.subtotal),
            })

        # Busca os pagamentos da venda
        payments_db = session.exec(
            select(Payment).where(Payment.sale_id == sale.id)
        ).all()
        payments_data = [
            {
                "id": str(p.id),
                "method": p.method.value,
                "amount": str(p.amount),
                "createdAt": p.created_at.isoformat() if p.created_at else None,
            }
            for p in payments_db
        ]

        names = _get_sale_names(sale, session)
        result.append({
            "id": str(sale.id),
            "branchId": str(sale.branch_id),
            "userId": str(sale.user_id),
            "userName": names["userName"],
            "customerId": str(sale.customer_id) if sale.customer_id else None,
            "customerName": names["customerName"],
            "grossValue": sale.gross_value,
            "discount": sale.discount,
            "totalValue": sale.total_value,
            "paymentMethod": sale.payment_method,
            "paymentStatus": sale.payment_status,
            "observations": sale.observations,
            "createdAt": sale.created_at.isoformat() if sale.created_at else None,
            "receiptNumber": sale.receipt_number,
            "items": items_data,
            "payments": payments_data,
        })

    return {"error": None, "data": result}


@router.get("/sales/{sale_id}")
def get_sale(
    sale_id: UUID,
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Retorna uma venda pelo ID com seus itens."""
    sale = session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venda não encontrada",
        )

    # Busca os itens
    items = session.exec(
        select(SaleItem, Product.name)
        .join(Product, SaleItem.product_id == Product.id)
        .where(SaleItem.sale_id == sale.id)
    ).all()

    items_data = []
    for item, product_name in items:
        items_data.append({
            "id": str(item.id),
            "saleId": str(item.sale_id),
            "productId": str(item.product_id),
            "productName": product_name,
            "quantity": item.quantity,
            "unitPrice": str(item.unit_price),
            "subtotal": str(item.subtotal),
        })

    # Busca os pagamentos da venda
    payments_db = session.exec(
        select(Payment).where(Payment.sale_id == sale.id)
    ).all()

    payments_data = [
        {
            "id": str(p.id),
            "method": p.method.value,
            "amount": str(p.amount),
            "createdAt": p.created_at.isoformat() if p.created_at else None,
        }
        for p in payments_db
    ]

    names = _get_sale_names(sale, session)
    return {
        "error": None,
        "data": {
            "id": str(sale.id),
            "branchId": str(sale.branch_id),
            "userId": str(sale.user_id),
            "userName": names["userName"],
            "customerId": str(sale.customer_id) if sale.customer_id else None,
            "customerName": names["customerName"],
            "grossValue": sale.gross_value,
            "discount": sale.discount,
            "totalValue": sale.total_value,
            "paymentMethod": sale.payment_method,
            "paymentStatus": sale.payment_status,
            "observations": sale.observations,
            "createdAt": sale.created_at.isoformat() if sale.created_at else None,
            "receiptNumber": sale.receipt_number,
            "items": items_data,
            "payments": payments_data,
        },
    }


@router.post("/sales", status_code=status.HTTP_201_CREATED)
def create_sale(
    body: SaleCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Cria uma nova venda com itens, atualiza estoque e registra movimentações."""
    if not body.items:
        print(f"[create_sale] Erro: Nenhum item enviado para venda do user {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A venda deve conter ao menos um item",
        )

    # ── RESOLUÇÃO DA FILIAL ──
    # Regra: Admin Global pode informar branchId no body; usuário comum usa sua branch fixa
    branch_id = body.branchId or current_user.branch_id

    if not branch_id:
        print(f"[create_sale] Erro: Admin {current_user.id} ({current_user.name}) não informou branchId no body")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filial não informada. Admin deve enviar branchId no corpo da requisição.",
        )

    # Verifica se a filial existe
    from app.models.branches import Branch
    branch = session.get(Branch, branch_id)
    if not branch:
        print(f"[create_sale] Erro: Filial {branch_id} não encontrada")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Filial informada não encontrada",
        )

    print(f"[create_sale] Venda iniciada — user={current_user.name} (admin={current_user.is_admin}), branch={branch.name} ({branch_id}), itens={len(body.items)}")

    # Valida e processa cada item
    for item_payload in body.items:
        product = session.get(Product, item_payload.productId)
        if not product or product.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto {item_payload.productId} não encontrado",
            )

        stock = session.exec(
            select(Stock).where(
                Stock.product_id == item_payload.productId,
                Stock.branch_id == branch_id,
            )
        ).first()

        if not stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Produto {product.name} sem estoque nesta filial",
            )

        if Decimal(str(item_payload.quantity)) > stock.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Estoque insuficiente para {product.name}. Disponível: {stock.quantity}",
            )

    # ── VALIDAÇÃO DOS PAGAMENTOS ──
    total_value = Decimal(str(body.totalValue))

    # Determina os pagamentos a registrar
    payments_to_process = []
    if body.payments:
        # Converte os payloads para validação
        for p in body.payments:
            amount = Decimal(str(p.amount))
            if amount <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Valor de pagamento inválido para {p.method.value}: {amount}",
                )
            payments_to_process.append({
                "method": p.method,
                "amount": amount,
            })

        # Soma dos pagamentos deve ser >= total da venda
        sum_payments = sum(p["amount"] for p in payments_to_process)
        if sum_payments < total_value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Valor total dos pagamentos (R$ {sum_payments:.2f}) é menor que "
                    f"o total da venda (R$ {total_value:.2f}). "
                    "Adicione mais formas de pagamento ou aumente os valores."
                ),
            )
    else:
        # Fallback: usa o paymentMethod tradicional como único pagamento
        payments_to_process.append({
            "method": PaymentMethod(body.paymentMethod or "cash"),
            "amount": total_value,
        })

    # Determina o método principal para o campo payment_method da Sale
    primary_method = payments_to_process[0]["method"].value

    # Cria a venda
    sale = Sale(
        branch_id=branch_id,
        user_id=current_user.id,
        customer_id=body.customerId,
        gross_value=Decimal(str(body.grossValue)),
        discount=Decimal(str(body.discount)),
        total_value=total_value,
        payment_method=primary_method,
        payment_status="completed",
    )
    session.add(sale)
    session.flush()  # Obtém o ID da venda

    # Processa cada item: cria SaleItem, atualiza estoque, registra movimentação
    for item_payload in body.items:
        product = session.get(Product, item_payload.productId)

        # Cria o item da venda
        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=item_payload.productId,
            quantity=item_payload.quantity,
            unit_price=Decimal(str(item_payload.unitPrice)),
            subtotal=Decimal(str(item_payload.subtotal)),
        )
        session.add(sale_item)

        # Atualiza o estoque
        stock = session.exec(
            select(Stock).where(
                Stock.product_id == item_payload.productId,
                Stock.branch_id == branch_id,
            )
        ).first()
        stock.quantity = stock.quantity - Decimal(str(item_payload.quantity))
        stock.updated_at = datetime.now()
        session.add(stock)

        # Registra movimentação de saída
        move = Move(
            branch_id=branch_id,
            product_id=item_payload.productId,
            user_id=current_user.id,
            type=MoveType.OUT,
            quantity=Decimal(str(item_payload.quantity)),
            unit_price=product.unit_price,
        )
        session.add(move)

    # ── REGISTRO DOS PAGAMENTOS ──
    for payment_data in payments_to_process:
        payment = Payment(
            sale_id=sale.id,
            method=payment_data["method"],
            amount=payment_data["amount"],
        )
        session.add(payment)

    session.commit()
    session.refresh(sale)

    # Monta a resposta
    items = session.exec(
        select(SaleItem, Product.name)
        .join(Product, SaleItem.product_id == Product.id)
        .where(SaleItem.sale_id == sale.id)
    ).all()

    items_data = []
    for item, product_name in items:
        items_data.append({
            "id": str(item.id),
            "saleId": str(item.sale_id),
            "productId": str(item.product_id),
            "productName": product_name,
            "quantity": item.quantity,
            "unitPrice": str(item.unit_price),
            "subtotal": str(item.subtotal),
        })

    # Busca os pagamentos registrados
    payments_data = []
    for payment in payments_to_process:
        payments_data.append({
            "method": payment["method"].value,
            "amount": str(payment["amount"]),
        })

    names = _get_sale_names(sale, session)
    return {
        "error": None,
        "data": {
            "id": str(sale.id),
            "branchId": str(sale.branch_id),
            "userId": str(sale.user_id),
            "userName": names["userName"],
            "customerId": str(sale.customer_id) if sale.customer_id else None,
            "customerName": names["customerName"],
            "grossValue": sale.gross_value,
            "discount": sale.discount,
            "totalValue": sale.total_value,
            "paymentMethod": sale.payment_method,
            "paymentStatus": sale.payment_status,
            "createdAt": sale.created_at.isoformat() if sale.created_at else None,
            "receiptNumber": sale.receipt_number,
            "items": items_data,
            "payments": payments_data,
        },
    }


# ─── PDV Checkout (Frente de Caixa Rápida) ──────────────────────────────────

# Mapeamento de strings para o enum PaymentMethod
_PAYMENT_METHOD_MAP = {
    "pix": PaymentMethod.PIX,
    "credit": PaymentMethod.CREDIT_CARD,
    "debit": PaymentMethod.DEBIT_CARD,
    "cash": PaymentMethod.CASH,
}


@router.post("/sales/checkout", status_code=status.HTTP_201_CREATED)
def pdv_checkout(
    body: PDVCheckoutPayload,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    PDV — Finaliza uma venda com operação rápida (Frente de Caixa).

    Lógica ACID:
    1. Valida se todos os itens existem e têm estoque suficiente.
    2. Calcula gross_value e total_value.
    3. Cria o registro Sale.
    4. Para cada item: cria SaleItem, subtrai do Stock, registra Move (type='out').
    5. Cria o registro Payment.
    6. Commit — se algo falhar, rollback automático.

    Retorna HTTP 400 se houver falta de estoque.
    """
    if not body.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A venda deve conter ao menos um item",
        )

    branch_id = body.branch_id

    # ── Verifica se a filial existe ──
    from app.models.branches import Branch
    branch = session.get(Branch, branch_id)
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Filial não encontrada",
        )

    # ── Valida estoque para cada item (antes de criar qualquer registro) ──
    items_to_process = []
    for item in body.items:
        product = session.get(Product, item.product_id)
        if not product or product.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto {item.product_id} não encontrado",
            )

        stock = session.exec(
            select(Stock).where(
                Stock.product_id == item.product_id,
                Stock.branch_id == branch_id,
            )
        ).first()

        if not stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Produto '{product.name}' sem estoque nesta filial",
            )

        qty = Decimal(str(item.quantity))
        if qty <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quantidade inválida para '{product.name}'",
            )

        if qty > stock.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Estoque insuficiente para '{product.name}'. "

                    f"Disponível: {stock.quantity}, solicitado: {qty}"
                ),
            )

        items_to_process.append({
            "product": product,
            "qty": qty,
            "unit_price": Decimal(str(item.unit_price)),
            "stock": stock,
        })

    # ── Calcula os valores da venda ──
    discount_value = Decimal(str(body.discount_amount))
    gross_value = sum(i["qty"] * i["unit_price"] for i in items_to_process)
    total_value = gross_value - discount_value
    if total_value < 0:
        total_value = Decimal("0.00")

    # ── Mapeia o método de pagamento ──
    method_key = body.payment_method.lower().strip()
    payment_method_enum = _PAYMENT_METHOD_MAP.get(method_key)
    if not payment_method_enum:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Método de pagamento inválido: '{body.payment_method}'. Use: pix, credit, debit, cash",
        )

    # ── Cria a venda ──
    sale = Sale(
        branch_id=branch_id,
        user_id=current_user.id,
        gross_value=gross_value,
        discount=discount_value,
        total_value=total_value,
        payment_method=payment_method_enum.value,
        payment_status="completed",
    )
    session.add(sale)
    session.flush()

    # ── Processa cada item: SaleItem, Stock, Move ──
    for i in items_to_process:
        product = i["product"]
        qty = i["qty"]
        unit_price = i["unit_price"]
        stock = i["stock"]
        subtotal = qty * unit_price

        # SaleItem
        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=product.id,
            quantity=qty,
            unit_price=unit_price,
            subtotal=subtotal,
        )
        session.add(sale_item)

        # Atualiza Stock (subtrai)
        stock.quantity = stock.quantity - qty
        stock.updated_at = datetime.now()
        session.add(stock)

        # Move (type='out')
        move = Move(
            branch_id=branch_id,
            product_id=product.id,
            user_id=current_user.id,
            type=MoveType.OUT,
            quantity=qty,
            unit_price=product.unit_price,
        )
        session.add(move)

    # ── Registra o pagamento ──
    payment = Payment(
        sale_id=sale.id,
        method=payment_method_enum,
        amount=total_value,
    )
    session.add(payment)

    # ── Commit ──
    session.commit()
    session.refresh(sale)

    # ── Monta a resposta ──
    sale_items_data = []
    for i in items_to_process:
        sale_items_data.append({
            "productId": str(i["product"].id),
            "productName": i["product"].name,
            "quantity": int(i["qty"]),
            "unitPrice": str(i["unit_price"]),
            "subtotal": str(i["qty"] * i["unit_price"]),
        })

    names = _get_sale_names(sale, session)

    return {
        "error": None,
        "data": {
            "id": str(sale.id),
            "branchId": str(sale.branch_id),
            "userId": str(sale.user_id),
            "userName": names["userName"],
            "customerName": names["customerName"],
            "grossValue": str(gross_value),
            "discount": str(discount_value),
            "totalValue": str(total_value),
            "paymentMethod": payment_method_enum.value,
            "paymentStatus": "completed",
            "createdAt": sale.created_at.isoformat() if sale.created_at else None,
            "receiptNumber": sale.receipt_number,
            "items": sale_items_data,
            "payments": [{
                "method": payment_method_enum.value,
                "amount": str(total_value),
            }],
        },
    }
