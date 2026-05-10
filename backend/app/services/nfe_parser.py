"""
Parser de XML de NFe (Nota Fiscal Eletrônica).

Extrai os dados estruturados do XML usando xml.etree.ElementTree,
lidando com o namespace padrão da SEFAZ.

Tags extraídas:
  - Cabeçalho: fornecedor, CNPJ, data emissão, número da nota
  - Itens: código, descrição, quantidade, valor unitário, unidade
"""

import xml.etree.ElementTree as ET
from typing import Any

from app.services.unit_mapper import map_unit

# Namespace padrão das NFe (v4.00)
NAMESPACE = "http://www.portalfiscal.inf.br/nfe"
NS = {"nfe": NAMESPACE}


def _text(element: ET.Element | None, default: str = "") -> str:
    """Retorna o texto de um elemento ou um valor padrão."""
    if element is not None and element.text:
        return element.text.strip()
    return default


def parse_nfe_xml(xml_content: str | bytes) -> dict[str, Any]:
    """Faz o parse completo do XML de uma NFe e devolve um JSON estruturado.

    Args:
        xml_content: Conteúdo do XML (string ou bytes).

    Returns:
        Dicionário com a estrutura:
        {
            "cabecalho": { ... },
            "itens": [ ... ],
            "total_itens": int,
            "valor_total": str
        }
    """
    root = ET.fromstring(xml_content)

    # ─── Cabeçalho ───────────────────────────────────────────────────────
    emit = root.find(".//nfe:emit", NS)
    ide = root.find(".//nfe:ide", NS)

    cabecalho = {
        "fornecedor": _text(emit.find("nfe:xNome", NS) if emit is not None else None),
        "cnpj": _text(emit.find("nfe:CNPJ", NS) if emit is not None else None),
        "dataEmissao": _text(ide.find("nfe:dhEmi", NS) if ide is not None else None),
        "numeroNota": _text(ide.find("nfe:nNF", NS) if ide is not None else None),
        "serie": _text(ide.find("nfe:serie", NS) if ide is not None else None),
        "chaveAcesso": _extract_chave(root),
        "naturezaOperacao": _text(
            ide.find("nfe:natOp", NS) if ide is not None else None
        ),
    }

    # ─── Itens ───────────────────────────────────────────────────────────
    itens: list[dict[str, Any]] = []
    for det in root.findall(".//nfe:det", NS):
        prod = det.find("nfe:prod", NS)
        if prod is None:
            continue

        n_item = det.get("nItem", "?")

        u_com = _text(prod.find("nfe:uCom", NS))
        q_com = _text(prod.find("nfe:qCom", NS))
        v_un_com = _text(prod.find("nfe:vUnCom", NS))

        item = {
            "numeroItem": int(n_item) if n_item.isdigit() else n_item,
            "codigoFornecedor": _text(prod.find("nfe:cProd", NS)),
            "descricao": _text(prod.find("nfe:xProd", NS)),
            "quantidade": _parse_decimal(q_com),
            "valorUnitario": _parse_decimal(v_un_com),
            "unidadeOriginal": u_com,
            "unidadeMapeada": map_unit(u_com),
            "valorTotal": _parse_decimal(_text(prod.find("nfe:vProd", NS))),
            "ean": _text(prod.find("nfe:cEAN", NS)),
        }
        itens.append(item)

    # ─── Totais ──────────────────────────────────────────────────────────
    total_element = root.find(".//nfe:total/nfe:ICMSTot", NS)
    valor_total = _text(total_element.find("nfe:vNF", NS)) if total_element is not None else ""
    valor_produtos = _text(total_element.find("nfe:vProd", NS)) if total_element is not None else ""

    return {
        "cabecalho": cabecalho,
        "itens": itens,
        "totalItens": len(itens),
        "valorTotalNota": _parse_decimal(valor_total) if valor_total else _parse_decimal(valor_produtos),
        "valorTotalProdutos": _parse_decimal(valor_produtos),
    }


def _parse_decimal(value: str) -> float | str:
    """Converte string numérica para float (ou retorna a string original)."""
    if not value:
        return ""
    # Substitui vírgula por ponto, caso venha formatado no padrão BR
    cleaned = value.strip().replace(",", ".")
    try:
        return round(float(cleaned), 4)
    except ValueError:
        return value


def _extract_chave(root: ET.Element) -> str:
    """Extrai a chave de acesso de 44 dígitos da NFe."""
    inf_nfe = root.find(".//nfe:infNFe", NS)
    if inf_nfe is not None:
        nfe_id = inf_nfe.get("Id", "")
        if nfe_id.startswith("NFe"):
            return nfe_id[3:]  # Remove o prefixo "NFe"
        return nfe_id
    return ""
