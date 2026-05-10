export type User = {
    id: string;
    name: string;
    email: string;
    isAdmin: boolean;
    isActive: boolean;
    role: 'admin' | 'manager' | 'operator';
    branchId?: string | null;
    branchName?: string | null;
    avatar?: string;
    createdAt?: string;
    updatedAt?: string;
};