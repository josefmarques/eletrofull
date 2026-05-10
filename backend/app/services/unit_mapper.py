"""
Helper de mapeamento de unidades de medida.

Unidades válidas do sistema Eletrosil:
  - 'un'  (unidade)
  - 'kg'  (quilograma)
  - 'l'   (litro)
  - 'rl'  (rolo)
  - 'm'   (metro)
  - 'par' (par)
  - 'cj'  (conjunto)

Mapeia variações comuns encontradas em XMLs de fornecedores
para o código interno correspondente.
"""

# Tabela de mapeamento: chave = string normalizada, valor = unidade destino
_UNIT_MAP: dict[str, str] = {
    # ── Unidade ──────────────────────────────────────────────────────────
    "UN": "un",
    "UNID": "un",
    "UNIDADE": "un",
    "UND": "un",
    "PC": "un",
    "PC1": "un",
    "PECA": "un",
    "PEÇA": "un",
    "PECAS": "un",
    "PEÇAS": "un",
    "PT": "un",
    "PT20": "un",
    "PT12": "un",
    "PT10": "un",
    "PT5": "un",
    "PT2": "un",
    "FD": "un",
    "CJ": "cj",
    # ── Conjunto ─────────────────────────────────────────────────────────
    "CONJ": "cj",
    "CONJUNTO": "cj",
    "KIT": "cj",
    # ── Caixa (mapeamos para 'cj' - conjunto, pois é o mais próximo) ────
    "CX": "cj",
    "CAIXA": "cj",
    # ── Quilograma ───────────────────────────────────────────────────────
    "KG": "kg",
    "KILO": "kg",
    "KILOS": "kg",
    "QUILO": "kg",
    "QUILOS": "kg",
    "QUILOGRAMA": "kg",
    "QUILOGRAMAS": "kg",
    # ── Litro ────────────────────────────────────────────────────────────
    "L": "l",
    "LT": "l",
    "LTS": "l",
    "LITRO": "l",
    "LITROS": "l",
    # ── Rolo ─────────────────────────────────────────────────────────────
    "RL": "rl",
    "ROLO": "rl",
    "ROLOS": "rl",
    # ── Metro ────────────────────────────────────────────────────────────
    "M": "m",
    "MT": "m",
    "MTS": "m",
    "METRO": "m",
    "METROS": "m",
    # ── Par ──────────────────────────────────────────────────────────────
    "PAR": "par",
    "PARES": "par",
    "PR": "par",
    # ── Metro quadrado / cúbico (fallback para 'un') ───────────────────
    "M2": "un",
    "M3": "un",
    "M²": "un",
    "M³": "un",
    "MQ": "un",
    # ── Grama ────────────────────────────────────────────────────────────
    "G": "g",
    "GR": "g",
    "GRAMA": "g",
    "GRAMAS": "g",
    # ── Mililitro ────────────────────────────────────────────────────────
    "ML": "ml",
    "MILILITRO": "ml",
    "MILILITROS": "ml",
    # ── Metro linear (alternativa) ──────────────────────────────────────
    "MLT": "m",
}


def map_unit(original_unit: str) -> str:
    """Tenta traduzir a unidade do fornecedor para o código interno.

    A lógica é:
      1. Remove espaços extras e converte para upper case.
      2. Remove dígitos do final (ex: 'PC1' → 'PC') e tenta novamente.
      3. Se não encontrar, tenta casamento parcial (se a chave está contida
         no texto original).
      4. Último recurso: retorna 'un' (unidade) como fallback seguro.

    Args:
        original_unit: Unidade textual vinda do XML (ex: 'PC1', 'ROLO', 'PT20').

    Returns:
        Código da unidade mapeada (ex: 'un', 'kg', 'rl', etc.).
    """
    if not original_unit or not original_unit.strip():
        return "un"

    normalized = original_unit.strip().upper()

    # 1. Tenta match exato
    if normalized in _UNIT_MAP:
        return _UNIT_MAP[normalized]

    # 2. Remove dígitos do final progressivamente (ex: PC1 → PC)
    stripped = normalized.rstrip("0123456789")
    if stripped and stripped != normalized and stripped in _UNIT_MAP:
        return _UNIT_MAP[stripped]

    # 3. Casamento parcial: alguma chave está contida no texto?
    for key, value in _UNIT_MAP.items():
        if key in normalized or normalized in key:
            return value

    # 4. Fallback seguro
    return "un"


def get_mapping_suggestion(original_unit: str) -> dict:
    """Retorna um dicionário com a unidade original e a mapeada.

    Útil para incluir no JSON de resposta.
    """
    return {
        "original": original_unit.strip() if original_unit else "",
        "mapeada": map_unit(original_unit),
    }
