import enum


class UnitType(str, enum.Enum):
    """Unidades de medida dos produtos.
    
    Valores correspondentes ao ENUM 'unit_type' do PostgreSQL.
    """
    UN = "un"       # Unidade (disjuntores, lâmpadas, ferramentas)
    CX = "cx"       # Caixa (parafusos em embalagem fechada, pisos)
    RL = "rl"       # Rolo (cabos elétricos, mangueiras)
    M = "m"         # Metro (venda fracionada de fios, tubos)
    PC = "pc"       # Peça (conexões específicas, barras de ferro)
    KG = "kg"       # Quilograma (pregos, parafusos a granel)
    LT = "lt"       # Litro (tintas, solventes, impermeabilizantes)
    PAR = "par"     # Par (luvas de proteção)
    CJ = "cj"       # Conjunto (kits de ferramentas ou vasos sanitários)
    G = "g"         # Grama
    ML = "ml"       # Mililitro
    L = "l"         # Litro (alternativa)


class PaymentMethod(str, enum.Enum):
    """Métodos de pagamento aceitos no PDV."""
    CASH = "cash"              # Dinheiro
    PIX = "pix"                # PIX
    CREDIT_CARD = "credit_card"  # Cartão de Crédito
    DEBIT_CARD = "debit_card"    # Cartão de Débito


class MoveType(str, enum.Enum):
    """Tipo de movimentação de estoque."""
    IN = "in"       # Entrada
    OUT = "out"     # Saída
