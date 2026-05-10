export type ApiResponse<T> = {
    error: string | null;
    data: T | null;
};

export type ApiListResponse<T> = {
    error: string | null;
    data: T[];
};
