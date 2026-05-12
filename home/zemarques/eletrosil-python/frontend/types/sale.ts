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
    sellerId?: string;
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
    userName?: string;
    sellerId?: string | null;
    sellerName?: string | null;
    customerId?: string | null;
    customerName?: string | null;
    grossValue: number;
    discount: number;
    totalValue: number;
    commissionValue?: string;
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

export interface CommissionReportItem {
    seller_id: string;
    seller_name: string;
    total_sales: number;
    total_value: number;
    total_commission: number;
}
