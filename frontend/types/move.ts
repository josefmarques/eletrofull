export type MoveType = 'in' | 'out';

export type Move = {
    id: string;
    productId: string;
    productName?: string;
    branchId: string;
    userId: string;
    type: MoveType;
    quantity: number;
    unitPrice: number;
    date?: string;
    createdAt?: string;
};

export type MovePayload = {
    productId: string;
    branchId: string;
    type: MoveType;
    quantity: number;
};
