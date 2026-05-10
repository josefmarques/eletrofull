export type Stock = {
    id: string;
    branchId: string;
    productId: string;
    quantity: number;
    minimumQuantity: number;
    maximumQuantity: number;
    updatedAt?: string;
};