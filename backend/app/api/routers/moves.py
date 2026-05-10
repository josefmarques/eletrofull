from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlmodel import Session, select, func, text
from pydantic import BaseModel
from uuid import UUID, uuid4
from typing import Optional
from datetime import datetime
from decimal import Decimal

from app.core.database import get_session
from app.models.moves import Move
from app.models.products import Product
from app.models.stocks import Stock
from app.models.enums import MoveType, UnitType
from app.models.supplier_maps import SupplierProductMap
from app.models.branches import Branch
from app.api.dependencies import get_current_user
from app.models.users import User
from app.services.nfe_parser import parse_nfe_xml

router = APIRouter(tags=["moves"])


# ─── Schemas ─────────────────────────────────────────────────────────────────


class MoveCreate(BaseModel):
    productId: UUID
    branchId: UUID
    type: MoveType
    quantity: int | str | float  # Aceita int, string numérica ou float do frontend


class SupplierMapItem(BaseModel):
    """Um item de mapeamento: código do fornecedor → produto local."""
    supplierCnpj: str
    supplierProductCode: str
    localProductId: UUID


class SupplierMapBatch(BaseModel):
    """Lote de mapeamentos para salvar de uma vez."""
    mappings: list[SupplierMapItem]


class ProcessEntryItem(BaseModel):
    """
    Um item para processar entrada física no estoque.

    - local_product_id: UUID do produto local (já mapeado)
    - quantidade: quantidade recebida (int, float ou string numérica)
    """
    local_product_id: UUID
    quantidade: int | float | str


class TransferItem(BaseModel):
    """
    Um item para transferência entre filiais.

    - product_id: UUID do produto
    - quantity: quantidade a transferir (int, float ou string numérica)
    """
    product_id: UUID
    quantity: int | float | str


class TransferBody(BaseModel):
    """
    Body da requisição de transferência multi-filial.

    - source_branch_id: UUID da filial de origem (de onde sai o estoque)
    - destination_branch_id: UUID da filial de destino (para onde vai o estoque)
    - items: lista de itens a transferir
    """
    source_branch_id: UUID
    destination_branch_id: UUID
    items: list[TransferItem]


class ProcessEntryBody(BaseModel):
    """
    Body da requisição de processamento de entrada em lote.

    - branch_id: UUID da filial onde o estoque será atualizado
    - items: lista de itens com produto local e quantidade
    """
    branch_id: UUID
    items: list[ProcessEntryItem]


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _enrich_items_with_mappings(
    itens: list[dict],
    cnpj_fornecedor: str,
    session: Session,
) -> None:
    """Consulta SupplierProductMap e enriquece cada item com vínculo existente."""
    if not cnpj_fornecedor:
        for item in itens:
            item["localProductId"] = None
            item["localProductName"] = None
        return

    maps = session.exec(
        select(SupplierProductMap).where(
            SupplierProductMap.supplier_cnpj == cnpj_fornecedor
        )
    ).all()

    map_dict = {m.supplier_product_code: m for m in maps}

    for item in itens:
        codigo = item.get("codigoFornecedor", "")
        if codigo in map_dict:
            mapping = map_dict[codigo]
            local_product = session.get(Product, mapping.local_product_id)
            if local_product and local_product.deleted_at is None:
                item["localProductId"] = str(mapping.local_product_id)
                item["localProductName"] = local_product.name
            else:
                item["localProductId"] = None
                item["localProductName"] = None
        else:
            item["localProductId"] = None
            item["localProductName"] = None


# ─── Endpoints ───────────────────────────────────────────────────────────────


@router.post("/moves/import-xml")
def import_xml_nfe(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """
    Recebe um arquivo XML de NFe, faz o parse e retorna os dados
    estruturados para conferência pelo frontend.

    Se o CNPJ do fornecedor já possuir mapeamentos salvos em
    supplier_product_maps, os itens virão com localProductId e
    localProductName preenchidos automaticamente.

    NÃO salva movimentação no estoque — apenas extrai e devolve o JSON.
    """
    if not file.filename or not file.filename.lower().endswith(".xml"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O arquivo enviado deve ser um XML (.xml).",
        )

    try:
        content = file.file.read()
        result = parse_nfe_xml(content)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Erro ao processar o XML: {exc}",
        )
    finally:
        file.file.close()

    # Enriquece itens com mapeamentos já existentes
    cnpj = result["cabecalho"].get("cnpj", "")
    _enrich_items_with_mappings(result["itens"], cnpj, session)

    return {
        "error": None,
        "data": result,
        "mensagem": (
            f"Nota fiscal {result['cabecalho']['numeroNota']} "
            f"processada com {result['totalItens']} itens."
        ),
    }


@router.post("/moves/import/map-products", status_code=status.HTTP_201_CREATED)
def map_products(
    body: SupplierMapBatch,
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """
    Salva (ou atualiza) em lote os mapeamentos de produtos do fornecedor
    para os produtos locais do estoque Eletrosil.

    Usa UPSERT (INSERT … ON CONFLICT DO UPDATE) para aprendizado contínuo:
    se o mesmo código de fornecedor já estiver mapeado, o vínculo é atualizado.

    Body:
    {
      "mappings": [
        {
          "supplierCnpj": "16163057001385",
          "supplierProductCode": "60490",
          "localProductId": "uuid-do-produto-local"
        }
      ]
    }
    """
    if not body.mappings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum mapeamento fornecido.",
        )

    # Validação: verifica se todos os localProductId existem
    product_ids = {m.localProductId for m in body.mappings}
    existing_products = session.exec(
        select(Product).where(
            Product.id.in_(product_ids),
            Product.deleted_at.is_(None),
        )
    ).all()
    existing_ids = {p.id for p in existing_products}

    for m in body.mappings:
        if m.localProductId not in existing_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto local {m.localProductId} não encontrado ou inativo.",
            )

    # UPSERT via SQL puro (SQLModel não tem upsert nativo)
    upsert_sql = text("""
        INSERT INTO supplier_product_maps
            (id, supplier_cnpj, supplier_product_code, local_product_id, created_at)
        VALUES
            (:id, :cnpj, :code, :local_pid, :now)
        ON CONFLICT (supplier_cnpj, supplier_product_code)
        DO UPDATE SET
            local_product_id = EXCLUDED.local_product_id,
            created_at = EXCLUDED.created_at
    """)

    now = datetime.now()

    for m in body.mappings:
        session.execute(
            upsert_sql,
            {
                "id": str(uuid4()),
                "cnpj": m.supplierCnpj,
                "code": m.supplierProductCode,
                "local_pid": str(m.localProductId),
                "now": now,
            },
        )

    session.commit()

    return {
        "error": None,
        "data": {
            "mapeados": len(body.mappings),
            "mensagem": f"{len(body.mappings)} produto(s) mapeado(s) com sucesso.",
        },
    }


@router.post("/moves/import/process-entry", status_code=status.HTTP_200_OK)
def process_entry(
    body: ProcessEntryBody,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Processa a entrada física de itens no estoque, em lote, após o mapeamento
    De/Para dos produtos do fornecedor para os produtos locais.

    Para cada item do array:
    A) Cria um registro na tabela `Move` com type='in', a quantidade recebida
       e o branch_id.
    B) Atualiza a tabela `Stock` (Upsert): busca se já existe registro de
       estoque para aquele branch_id e product_id. Se sim, soma a quantidade
       atual + a nova. Se não existir, cria a linha no Stock com essa
       quantidade inicial.

    Tudo em uma única transação atômica: se falhar em algum item, tudo é
    revertido (rollback automático via Session do SQLModel).

    Body:
    {
      "branch_id": "uuid-da-filial",
      "items": [
        {"local_product_id": "uuid-produto", "quantidade": 10},
        {"local_product_id": "uuid-outro-produto", "quantidade": 5}
      ]
    }
    """
    if not body.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum item fornecido para processar entrada.",
        )

    # Verifica se a filial existe
    branch = session.get(Branch, body.branch_id)
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Filial não encontrada.",
        )

    items_processados = []
    erros = []

    # Validação prévia de todos os itens antes de começar a transação
    for item in body.items:
        try:
            qty = Decimal(str(item.quantidade))
            if qty <= 0:
                erros.append({
                    "product_id": str(item.local_product_id),
                    "error": "Quantidade deve ser maior que zero",
                })
                continue

            product = session.get(Product, item.local_product_id)
            if not product or product.deleted_at is not None:
                erros.append({
                    "product_id": str(item.local_product_id),
                    "error": "Produto não encontrado ou inativo",
                })
                continue

            # Cria o registro de movimentação (type='in')
            move = Move(
                branch_id=body.branch_id,
                product_id=item.local_product_id,
                user_id=current_user.id,
                type=MoveType.IN,
                quantity=qty,
                unit_price=product.unit_price,
            )
            session.add(move)

            # Upsert no Stock: busca registro existente
            stock = session.exec(
                select(Stock).where(
                    Stock.product_id == item.local_product_id,
                    Stock.branch_id == body.branch_id,
                )
            ).first()

            if stock:
                # Já existe estoque para este produto/filial → soma
                stock.quantity = stock.quantity + qty
                stock.updated_at = datetime.now()
                session.add(stock)
            else:
                # Não existe → cria com a quantidade inicial
                stock = Stock(
                    branch_id=body.branch_id,
                    product_id=item.local_product_id,
                    quantity=qty,
                    minimum_quantity=Decimal("0"),
                    maximum_quantity=Decimal("0"),
                )
                session.add(stock)

            items_processados.append({
                "product_id": str(item.local_product_id),
                "product_name": product.name,
                "quantidade": str(qty),
            })

        except Exception as exc:
            erros.append({
                "product_id": str(item.local_product_id),
                "error": str(exc),
            })

    # Se nenhum item foi processado com sucesso, retorna erro
    if not items_processados and erros:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Nenhum item pôde ser processado.", "errors": erros},
        )

    # Commit único — se algo falhou até aqui, o SQLModel faz rollback automático
    session.commit()

    return {
        "error": None,
        "data": {
            "branch_id": str(body.branch_id),
            "branch_name": branch.name,
            "total_processados": len(items_processados),
            "itens": items_processados,
            "erros": erros if erros else None,
            "mensagem": (
                f"{len(items_processados)} produto(s) deram entrada no estoque "
                f"de {branch.name} com sucesso."
            ),
        },
    }


@router.post("/moves/transfer", status_code=status.HTTP_200_OK)
def transfer_stock(
    body: TransferBody,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Transfere mercadorias entre filiais de forma atômica.

    Para cada item da lista:
    A) Verifica se a filial de origem possui saldo suficiente.
    B) Subtrai a quantidade do Stock da origem.
    C) Cria um Move type='out' para a origem.
    D) Upsert no Stock do destino (soma se existir, cria se não).
    E) Cria um Move type='in' para o destino.

    Tudo em uma única transação: se qualquer item falhar, rollback total.
    """
    if not body.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum item fornecido para transferência.",
        )

    if body.source_branch_id == body.destination_branch_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A filial de origem e destino devem ser diferentes.",
        )

    # Valida se as filiais existem
    source_branch = session.get(Branch, body.source_branch_id)
    if not source_branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Filial de origem não encontrada.",
        )

    dest_branch = session.get(Branch, body.destination_branch_id)
    if not dest_branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Filial de destino não encontrada.",
        )

    itens_processados = []
    erros = []

    # ── Validação prévia: verificar saldo e produtos existem ──
    for item in body.items:
        try:
            qty = Decimal(str(item.quantity))
            if qty <= 0:
                erros.append({
                    "product_id": str(item.product_id),
                    "error": "Quantidade deve ser maior que zero",
                })
                continue

            product = session.get(Product, item.product_id)
            if not product or product.deleted_at is not None:
                erros.append({
                    "product_id": str(item.product_id),
                    "error": "Produto não encontrado ou inativo",
                })
                continue

            # Verifica saldo na origem
            source_stock = session.exec(
                select(Stock).where(
                    Stock.product_id == item.product_id,
                    Stock.branch_id == body.source_branch_id,
                )
            ).first()

            if not source_stock or source_stock.quantity < qty:
                saldo = source_stock.quantity if source_stock else Decimal("0")
                erros.append({
                    "product_id": str(item.product_id),
                    "product_name": product.name,
                    "error": (
                        f"Saldo insuficiente na origem. "
                        f"Produto: {product.name}, "
                        f"Solicitado: {qty}, "
                        f"Disponível: {saldo}"
                    ),
                })
                continue

            # Se passou por todas as validações, armazena para processamento
            itens_processados.append({
                "product_id": item.product_id,
                "product_name": product.name,
                "quantity": qty,
                "unit_price": product.unit_price,
            })

        except Exception as exc:
            erros.append({
                "product_id": str(item.product_id),
                "error": str(exc),
            })

    # Se houver erros, retorna 400 com detalhes — nenhuma alteração é feita
    if erros:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Erro(s) de validação na transferência. Nenhuma alteração foi feita.",
                "errors": erros,
            },
        )

    # ── Executa as operações de transferência ──
    for item in itens_processados:
        product_id = item["product_id"]
        qty = item["quantity"]
        unit_price = item["unit_price"]

        # A) Subtrai do Stock da origem
        source_stock = session.exec(
            select(Stock).where(
                Stock.product_id == product_id,
                Stock.branch_id == body.source_branch_id,
            )
        ).first()
        source_stock.quantity = source_stock.quantity - qty
        source_stock.updated_at = datetime.now()
        session.add(source_stock)

        # B) Move type='out' para a origem
        move_out = Move(
            branch_id=body.source_branch_id,
            product_id=product_id,
            user_id=current_user.id,
            type=MoveType.OUT,
            quantity=qty,
            unit_price=unit_price,
        )
        session.add(move_out)

        # C) Upsert no Stock do destino
        dest_stock = session.exec(
            select(Stock).where(
                Stock.product_id == product_id,
                Stock.branch_id == body.destination_branch_id,
            )
        ).first()

        if dest_stock:
            dest_stock.quantity = dest_stock.quantity + qty
            dest_stock.updated_at = datetime.now()
            session.add(dest_stock)
        else:
            dest_stock = Stock(
                branch_id=body.destination_branch_id,
                product_id=product_id,
                quantity=qty,
                minimum_quantity=Decimal("0"),
                maximum_quantity=Decimal("0"),
            )
            session.add(dest_stock)

        # D) Move type='in' para o destino
        move_in = Move(
            branch_id=body.destination_branch_id,
            product_id=product_id,
            user_id=current_user.id,
            type=MoveType.IN,
            quantity=qty,
            unit_price=unit_price,
        )
        session.add(move_in)

    # Commit único — se algo explodir, rollback automático
    session.commit()

    return {
        "error": None,
        "data": {
            "source_branch_id": str(body.source_branch_id),
            "source_branch_name": source_branch.name,
            "destination_branch_id": str(body.destination_branch_id),
            "destination_branch_name": dest_branch.name,
            "total_itens": len(itens_processados),
            "itens": [
                {
                    "product_id": str(i["product_id"]),
                    "product_name": i["product_name"],
                    "quantity": str(i["quantity"]),
                }
                for i in itens_processados
            ],
            "mensagem": (
                f"Transferência de {len(itens_processados)} produto(s) "
                f"de {source_branch.name} para {dest_branch.name} "
                f"realizada com sucesso."
            ),
        },
    }


@router.get("/moves")
def list_moves(
    productId: Optional[UUID] = Query(None, alias="productId"),
    branchId: Optional[UUID] = Query(None, alias="branchId"),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_user),
):
    """Lista movimentações de estoque com filtros opcionais."""
    query = (
        select(Move, Product.name)
        .join(Product, Move.product_id == Product.id)
        .order_by(Move.created_at.desc())
    )

    if productId:
        query = query.where(Move.product_id == productId)
    if branchId:
        query = query.where(Move.branch_id == branchId)

    query = query.offset(offset).limit(limit)
    rows = session.exec(query).all()

    result = []
    for move, product_name in rows:
        result.append({
            "id": str(move.id),
            "productId": str(move.product_id),
            "productName": product_name,
            "branchId": str(move.branch_id),
            "userId": str(move.user_id),
            "type": move.type.value if hasattr(move.type, "value") else str(move.type),
            "quantity": move.quantity,
            "unitPrice": move.unit_price,
            "createdAt": move.created_at.isoformat() if move.created_at else None,
        })

    return {"error": None, "data": result}


@router.post("/moves", status_code=status.HTTP_201_CREATED)
def create_move(
    body: MoveCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Registra uma movimentação de estoque e atualiza o saldo."""
    # Verifica se o produto existe
    product = session.get(Product, body.productId)
    if not product or product.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado",
        )

    # Converte a quantity para Decimal
    qty = Decimal(str(body.quantity))

    if qty <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A quantidade deve ser maior que zero",
        )

    # Busca ou CRIA o registro de estoque (Upsert)
    stock = session.exec(
        select(Stock).where(
            Stock.product_id == body.productId,
            Stock.branch_id == body.branchId,
        )
    ).first()

    if not stock:
        # Cria o registro de estoque do zero para esta filial
        stock = Stock(
            branch_id=body.branchId,
            product_id=body.productId,
            quantity=Decimal("0"),
            minimum_quantity=Decimal("0"),
            maximum_quantity=Decimal("0"),
        )
        session.add(stock)
        session.flush()

    # Valida se há quantidade suficiente para saída
    if body.type == MoveType.OUT and qty > stock.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quantidade insuficiente em estoque. Disponível: {stock.quantity}",
        )

    # Calcula o novo saldo
    if body.type == MoveType.IN:
        stock.quantity = stock.quantity + qty
    else:
        stock.quantity = stock.quantity - qty

    stock.updated_at = datetime.now()
    session.add(stock)

    # Cria o registro da movimentação
    move = Move(
        branch_id=body.branchId,
        product_id=body.productId,
        user_id=current_user.id,
        type=body.type,
        quantity=qty,
        unit_price=product.unit_price,
    )
    session.add(move)
    session.commit()
    session.refresh(move)

    return {
        "error": None,
        "data": {
            "id": str(move.id),
            "productId": str(move.product_id),
            "productName": product.name,
            "branchId": str(move.branch_id),
            "userId": str(move.user_id),
            "type": move.type.value if hasattr(move.type, "value") else str(move.type),
            "quantity": move.quantity,
            "unitPrice": move.unit_price,
            "createdAt": move.created_at.isoformat() if move.created_at else None,
        },
    }
