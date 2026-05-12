export type User = {
    id: string;
    name: string;
    email: string;
    isAdmin: boolean;
    isActive: boolean;
    role: 'admin' | 'manager' | 'operator' | 'vendedor';
    branchId?: string | null;
    branchName?: string | null;
    avatar?: string;
    commissionRate?: number;
    createdAt?: string;
    updatedAt?: string;
};
