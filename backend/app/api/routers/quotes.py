from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from pydantic import BaseModel
from uuid import UUID, uuid4
from typing import Optional
from datetime import timedelta
from decimal import Decimal

from app.core.database import get_session
from app.models.quotes import Quote, QuoteItem
from app.models.products import Product
from app.models.stocks import Stock
from app.models.branches import Branch
from app.models.customers import Customer
from app.api.dependencies import get_current_user
from app.models.users import User
from app.core.timezone import br_now_naive

router = APIRouter(tags=["quotes"])


class QuoteItemPayload(BaseModel):
    productId: UUID
    quantity: int
    unitPrice: Decimal
    subtotal: Decimal
    name: Optional[str] = None


class QuoteCreate(BaseModel):
    branchId: UUID
    customerId: Optional[UUID] = None
    sellerId: Optional[UUID] = None
    grossValue: Decimal
    totalValue: Decimal
    discount: Decimal = Decimal("0")
    observations: Optional[str] = None
    items: list[QuoteItemPayload]


class QuoteUpdate(BaseModel):
    customerId: Optional[UUID] = None
    sellerId: Optional[UUID] = None
    grossValue: Optional[Decimal] = None
    totalValue: Optional[Decimal] = None
    discount: Optional[Decimal] = None
    observations: Optional[str] = None
    items: Optional[list[QuoteItemPayload]] = None


# ─── Listar orçamentos ─────────────────────────────────────────────────────


@router.get("/quotes", status_code=status.HTTP_200_OK)
def list_quotes(
    branchId: Optional[UUID] = Query(None, alias="branchId"),
    sellerId: Optional[UUID] = Query(None, alias="sellerId"),
    status: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    query = (
        select(Quote)
        .order_by(Quote.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    if branchId:
        query = query.where(Quote.branch_id == branchId)
    if sellerId:
        query = query.where(Quote.seller_id == sellerId)
    if status:
        query = query.where(Quote.status == status)

    quotes = session.exec(query).all()

    result = []
    for q in quotes:
        items = session.exec(
            select(QuoteItem).where(QuoteItem.quote_id == q.id)
        ).all()

        user = session.get(User, q.user_id)
        seller_name = None
        if q.seller_id:
            seller = session.get(User, q.seller_id)
            seller_name = seller.name if seller else None
        customer_name = None
        if q.customer_id:
            customer = session.get(Customer, q.customer_id)
            customer_name = customer.name if customer else None

        result.append({
            "id": str(q.id),
            "branchId": str(q.branch_id),
            "userId": str(q.user_id),
            "userName": user.name if user else None,
            "sellerId": str(q.seller_id) if q.seller_id else None,
            "sellerName": seller_name,
            "customerId": str(q.customer_id) if q.customer_id else None,
            "customerName": customer_name,
            "grossValue": str(q.gross_value),
            "discount": str(q.discount),
            "totalValue": str(q.total_value),
            "status": q.status,
            "observations": q.observations,
            "expiresAt": q.expires_at.isoformat() if q.expires_at else None,
            "createdAt": q.created_at.isoformat() if q.created_at else None,
            "updatedAt": q.updated_at.isoformat() if q.updated_at else None,
            "items": [
                {
                    "id": str(item.id),
                    "productId": str(item.product_id),
                    "productName": item.product_name,
                    "quantity": item.quantity,
                    "unitPrice": str(item.unit_price),
                    "subtotal": str(item.subtotal),
                }
                for item in items
            ],
        })

    return {"error": None, "data": result}


# ─── Buscar orçamento por ID ──────────────────────────────────────────────


@router.get("/quotes/{quote_id}", status_code=status.HTTP_200_OK)
def get_quote(
    quote_id: UUID,
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    quote = session.get(Quote, quote_id)
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orçamento não encontrado.",
        )

    items = session.exec(
        select(QuoteItem).where(QuoteItem.quote_id == quote.id)
    ).all()

    user = session.get(User, quote.user_id)
    seller_name = None
    if quote.seller_id:
        seller = session.get(User, quote.seller_id)
        seller_name = seller.name if seller else None
    customer_name = None
    if quote.customer_id:
        customer = session.get(Customer, quote.customer_id)
        customer_name = customer.name if customer else None

    return {
        "error": None,
        "data": {
            "id": str(quote.id),
            "branchId": str(quote.branch_id),
            "userId": str(quote.user_id),
            "userName": user.name if user else None,
            "sellerId": str(quote.seller_id) if quote.seller_id else None,
            "sellerName": seller_name,
            "customerId": str(quote.customer_id) if quote.customer_id else None,
            "customerName": customer_name,
            "grossValue": str(quote.gross_value),
            "discount": str(quote.discount),
            "totalValue": str(quote.total_value),
            "status": quote.status,
            "observations": quote.observations,
            "expiresAt": quote.expires_at.isoformat() if quote.expires_at else None,
            "createdAt": quote.created_at.isoformat() if quote.created_at else None,
            "updatedAt": quote.updated_at.isoformat() if quote.updated_at else None,
            "items": [
                {
                    "id": str(item.id),
                    "productId": str(item.product_id),
                    "productName": item.product_name,
                    "quantity": item.quantity,
                    "unitPrice": str(item.unit_price),
                    "subtotal": str(item.subtotal),
                }
                for item in items
            ],
        },
    }


# ─── Criar orçamento ──────────────────────────────────────────────────────


@router.post("/quotes", status_code=status.HTTP_201_CREATED)
def create_quote(
    body: QuoteCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    branch = session.get(Branch, body.branchId)
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unidade não encontrada.",
        )

    if not body.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O orçamento deve ter pelo menos um item.",
        )

    for item_payload in body.items:
        product = session.get(Product, item_payload.productId)
        if not product or product.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto {item_payload.productId} não encontrado ou inativo.",
            )

    expires_at = br_now_naive() + timedelta(days=7)

    quote = Quote(
        branch_id=body.branchId,
        user_id=current_user.id,
        customer_id=body.customerId,
        seller_id=body.sellerId,
        gross_value=body.grossValue,
        discount=body.discount,
        total_value=body.totalValue,
        status="pendente",
        expires_at=expires_at,
        observations=body.observations,
    )
    session.add(quote)
    session.flush()

    for item_payload in body.items:
        product = session.get(Product, item_payload.productId)
        product_name = item_payload.name or (product.name if product else None)

        quote_item = QuoteItem(
            quote_id=quote.id,
            product_id=item_payload.productId,
            product_name=product_name,
            quantity=item_payload.quantity,
            unit_price=item_payload.unitPrice,
            subtotal=item_payload.subtotal,
        )
        session.add(quote_item)

    session.commit()
    session.refresh(quote)

    return {
        "error": None,
        "data": {
            "id": str(quote.id),
            "status": quote.status,
            "totalValue": str(quote.total_value),
            "mensagem": "Orçamento criado com sucesso.",
        },
    }


# ─── Validar orçamento para conversão (sem criar venda) ──────────────────
#
# ATENÇÃO: Este endpoint NÃO cria venda nem baixa estoque.
# Ele apenas valida que o orçamento pode ser convertido e retorna os dados
# para que o PDV carregue os itens. A venda efetiva ocorre via
# POST /sales/checkout com o campo quote_id.


@router.post("/quotes/{quote_id}/convert", status_code=status.HTTP_200_OK)
def validate_quote_for_conversion(
    quote_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Valida se um orçamento pode ser convertido e retorna seus dados.
    
    Regras:
    - Orçamento deve existir
    - Status deve ser 'pendente'
    - Não pode estar expirado
    - Deve ter itens
    
    NÃO cria venda, NÃO baixa estoque, NÃO altera status.
    A conversão real ocorre no PDV ao finalizar a venda.
    """
    quote = session.get(Quote, quote_id)
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orçamento não encontrado.",
        )

    if quote.status != "pendente":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Orçamento já está com status '{quote.status}'.",
        )

    if quote.expires_at and quote.expires_at < br_now_naive():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Orçamento expirado. Crie um novo orçamento.",
        )

    quote_items = session.exec(
        select(QuoteItem).where(QuoteItem.quote_id == quote.id)
    ).all()

    if not quote_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Orçamento sem itens para converter.",
        )

    user = session.get(User, quote.user_id)
    seller_name = None
    if quote.seller_id:
        seller = session.get(User, quote.seller_id)
        seller_name = seller.name if seller else None
    customer_name = None
    if quote.customer_id:
        customer = session.get(Customer, quote.customer_id)
        customer_name = customer.name if customer else None

    return {
        "error": None,
        "data": {
            "id": str(quote.id),
            "branchId": str(quote.branch_id),
            "userId": str(quote.user_id),
            "userName": user.name if user else None,
            "sellerId": str(quote.seller_id) if quote.seller_id else None,
            "sellerName": seller_name,
            "customerId": str(quote.customer_id) if quote.customer_id else None,
            "customerName": customer_name,
            "grossValue": str(quote.gross_value),
            "discount": str(quote.discount),
            "totalValue": str(quote.total_value),
            "status": quote.status,
            "observations": quote.observations,
            "expiresAt": quote.expires_at.isoformat() if quote.expires_at else None,
            "createdAt": quote.created_at.isoformat() if quote.created_at else None,
            "updatedAt": quote.updated_at.isoformat() if quote.updated_at else None,
            "items": [
                {
                    "id": str(item.id),
                    "productId": str(item.product_id),
                    "productName": item.product_name,
                    "quantity": item.quantity,
                    "unitPrice": str(item.unit_price),
                    "subtotal": str(item.subtotal),
                }
                for item in quote_items
            ],
            "mensagem": "Orçamento validado. Leve os itens para o PDV para finalizar a venda.",
        },
    }


# ─── Cancelar orçamento ────────────────────────────────────────────────────


@router.post("/quotes/{quote_id}/cancel", status_code=status.HTTP_200_OK)
def cancel_quote(
    quote_id: UUID,
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    quote = session.get(Quote, quote_id)
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orçamento não encontrado.",
        )

    if quote.status == "cancelado":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Orçamento já está cancelado.",
        )

    if quote.status == "convertido":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Orçamento já foi convertido em venda e não pode ser cancelado.",
        )

    quote.status = "cancelado"
    session.add(quote)
    session.commit()

    return {
        "error": None,
        "data": {
            "id": str(quote.id),
            "status": quote.status,
            "mensagem": "Orçamento cancelado com sucesso.",
        },
    }
