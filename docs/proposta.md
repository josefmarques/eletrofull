export type Product = {
    id: string;
    name: string;
    categoryId: string;
    categoryName?: string;
    unitPrice: number; // in cents
    unitType: 'un' | 'cx' | 'rl' | 'm' | 'pc' | 'kg' | 'lt' | 'par' | 'cj';
    quantity: number; // current stock
    minimumQuantity: number;
    maximumQuantity: number;
    createdAt?: string;
    updatedAt?: string;

    // Dashboard extra fields
    stockPct?: number;       // (quantity / minimumQuantity) * 100 — low-stock
    moneyAtRisk?: number;    // quantity * unitPrice — low-stock (frozen money in cents)
    frozenMoney?: number;    // quantity * unitPrice — stagnant (frozen money in cents)
};