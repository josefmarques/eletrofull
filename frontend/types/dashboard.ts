export type InventoryValue = {
    totalValue: number;
    totalItems?: number;
};

export type MoveSummaryItem = {
    value: number;
    count: number;
};

export type MovesSummary = {
    in: MoveSummaryItem;
    out: MoveSummaryItem;
};

export type MoveGraphItem = {
    date: string;
    in: number;
    out: number;
};

