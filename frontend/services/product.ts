import { getClientApi } from "@/lib/client-api";
import { Product } from "@/types/product";
import { ApiListResponse, ApiResponse } from "@/types/api";

export const productService = {
    searchProducts: async (
        searchTerm: string,
        branchId?: string
    ): Promise<ApiListResponse<Product>> => {
        try {
            const api = getClientApi();
            const params: Record<string, any> = {};
            if (searchTerm) params.name = searchTerm;
            if (branchId) params.branchId = branchId;

            const response = await api.get('/products', { params });
            return response.data;
        } catch (error: any) {
            return { error: 'Erro ao buscar produtos', data: [] };
        }
    },

    getProductById: async (id: string, branchId?: string): Promise<ApiResponse<Product>> => {
        try {
            const api = getClientApi();
            const response = await api.get(`/products/${id}`, {
                params: { branchId }
            });
            return response.data;
        } catch (error: any) {
            return { error: error.response?.data?.error || 'Erro ao buscar produto', data: null };
        }
    },

    validateStock: async (
        items: { productId: string; quantity: number }[],
        branchId: string
    ): Promise<{ valid: boolean; errors: { productId: string; available: number; requested: number }[] }> => {
        try {
            const api = getClientApi();
            const response = await api.post('/stocks/validate', { items, branchId });
            return response.data;
        } catch {
            return { valid: true, errors: [] };
        }
    }
};
