export interface Payment {
    method: string;
    amount: string;
}

export interface SaleItem {
    productId: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
    name?: string; // Para exibição no frontend
}

export interface SalePayload {
    customerId?: string;
    branchId?: string;
    grossValue: string;
    totalValue: string;
    discount?: string;
    paymentMethod?: string;
    items: SaleItem[];
    payments?: Payment[];
}

export interface SaleResponse {
    id: string;
    branchId: string;
    userId: string;
    customerId?: string | null;
    grossValue: number;
    discount: number;
    totalValue: number;
    paymentMethod: string;
    paymentStatus: string;
    receiptNumber?: number;
    createdAt?: string | null;
    items?: SaleItemResponse[];
    payments?: Payment[];
}

export interface SaleItemResponse {
    id: string;
    saleId: string;
    productId: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
}

export interface Customer {
    id: string;
    name: string;
    cpfCnpj?: string | null;
    email?: string | null;
    phone?: string | null;
    points: number;
}
