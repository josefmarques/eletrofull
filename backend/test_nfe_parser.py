"""
Script de validação do parser de NFe e mapeamento de unidades.
Uso: python test_nfe_parser.py
"""
import json
import sys
import os

# Garante que o diretório backend/ está no sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.unit_mapper import map_unit, get_mapping_suggestion
from app.services.nfe_parser import parse_nfe_xml

# ─── 1. Testes do Mapeamento de Unidades ─────────────────────────────────
print("=" * 60)
print("🧪 Testes de Mapeamento de Unidades")
print("=" * 60)

testes = [
    ("PC1", "un"),
    ("PC", "un"),
    ("PT20", "un"),
    ("PT12", "un"),
    ("ROLO", "rl"),
    ("ROLOS", "rl"),
    ("MT", "m"),
    ("M", "m"),
    ("METRO", "m"),
    ("KG", "kg"),
    ("KILO", "kg"),
    ("LT", "l"),
    ("LITRO", "l"),
    ("CX", "cj"),
    ("CAIXA", "cj"),
    ("PAR", "par"),
    ("PARES", "par"),
    ("M2", "un"),
    ("UNID", "un"),
    ("UND", "un"),
    ("PECA", "un"),
    ("", "un"),
    ("XXXX_INEXISTENTE", "un"),
]

erros = 0
for entrada, esperado in testes:
    resultado = map_unit(entrada)
    status = "✅" if resultado == esperado else "❌"
    if resultado != esperado:
        erros += 1
    print(f"  {status} map_unit('{entrada:20s}') → '{resultado}' (esperado: '{esperado}')")

print(f"\nResultado: {len(testes) - erros}/{len(testes)} passaram\n")

# ─── 2. Teste do Parser com o XML real ───────────────────────────────────
print("=" * 60)
print("🧪 Parse do XML de NFe")
print("=" * 60)

xml_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..",
    "31260516163057001385550050005201391930980342.xml",
)

with open(xml_path, "rb") as f:
    xml_content = f.read()

result = parse_nfe_xml(xml_content)

print("\n📋 Cabeçalho:")
cab = result["cabecalho"]
print(f"  Fornecedor:     {cab['fornecedor']}")
print(f"  CNPJ:           {cab['cnpj']}")
print(f"  Data Emissão:   {cab['dataEmissao']}")
print(f"  Nº Nota:        {cab['numeroNota']}")
print(f"  Série:          {cab['serie']}")
print(f"  Chave Acesso:   {cab['chaveAcesso']}")
print(f"  Nat. Operação:  {cab['naturezaOperacao']}")

print(f"\n📦 Itens ({result['totalItens']}):")
for i, item in enumerate(result["itens"], 1):
    print(f"  {i}. [{item['codigoFornecedor']}] {item['descricao'][:50]:50s}")
    print(f"     Qtd: {item['quantidade']:>8}  |  V.Unit: {item['valorUnitario']:>8}")
    print(f"     Un.Orig: '{item['unidadeOriginal']}'  →  Un.Map: '{item['unidadeMapeada']}'")

print(f"\n💰 Totais:")
print(f"  Valor Total Produtos: R$ {result['valorTotalProdutos']}")
print(f"  Valor Total Nota:     R$ {result['valorTotalNota']}")

print("\n✅ Teste concluído com sucesso!")
