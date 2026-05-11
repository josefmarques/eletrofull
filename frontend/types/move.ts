export type MoveType = 'in' | 'out';

export type Move = {
    id: string;
    productId: string;
    productName?: string;
    branchId: string;
    branchName?: string;     // Nome da unidade
    userId: string;
    userName?: string;        // Nome do responsável
    type: MoveType;
    quantity: number;
    unitPrice: number;
    description?: string;     // Descrição textual (ex: "Transferência de Galpão para Centro")
    transferId?: string;      // UUID que vincula movimentos de transferência
    origin?: string;          // Legível: "Sistema/Fornecedor", nome da unidade, etc.
    destination?: string;     // Legível: "Descarte/Ajuste", nome da unidade, etc.
    date?: string;
    createdAt?: string;
};

export type MovePayload = {
    productId: string;
    branchId: string;
    type: MoveType;
    quantity: number;
    description?: string;
};
