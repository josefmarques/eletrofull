import { getServerApi } from "@/lib/server-api";
import { Product } from "@/types/product";
import { ApiListResponse, ApiResponse } from "@/types/api";

export const productServerService = {
    /**
     * Busca a lista de produtos com suporte a multi-filial, busca e paginação (Servidor)
     */
    getProducts: async (
        branchId?: string,
        name?: string,
        offset: number = 0,
        limit: number = 10
    ): Promise<ApiListResponse<Product>> => {
        try {
            const api = await getServerApi();
            const params: Record<string, any> = { offset, limit };
            if (branchId) params.branchId = branchId;
            if (name) params.name = name;

            const response = await api.get('/products', { params });
            return response.data;
        } catch (error) {
            console.error("Erro ao carregar produtos:", error);
            return { error: 'Erro ao buscar produtos no servidor', data: [] };
        }
    },

    /**
     * Busca detalhes de um produto específico (Servidor)
     */
    getProductById: async (id: string, branchId?: string): Promise<ApiResponse<Product>> => {
        try {
            const api = await getServerApi();
            const response = await api.get(`/products/${id}`, {
                params: { branchId }
            });
            return response.data;
        } catch (error: any) {
            return { error: error.response?.data?.error || 'Erro ao buscar produto', data: null };
        }
    }
};
