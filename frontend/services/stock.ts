import { getServerApi } from "@/lib/server-api";
import { Stock } from "@/types/stock";
import { ApiListResponse, ApiResponse } from "@/types/api";

export const stockService = {
    /**
     * Busca todos os estoques com paginação
     */
    getStocks: async (offset: number = 0, limit: number = 10): Promise<ApiListResponse<Stock>> => {
        try {
            const api = await getServerApi();
            const response = await api.get('/stocks', {
                params: { offset, limit }
            });
            return response.data;
        } catch (error: any) {
            return { error: 'Erro ao buscar estoques', data: [] };
        }
    },

    /**
     * Busca um estoque específico pelo ID
     */
    getStockById: async (id: string): Promise<ApiResponse<Stock>> => {
        try {
            const api = await getServerApi();
            const response = await api.get(`/stocks/${id}`);
            return response.data;
        } catch (error: any) {
            return { error: error.response?.data?.error || 'Erro ao buscar estoque', data: null };
        }
    },

    /**
     * Busca estoques por filial
     */
    getStocksByBranch: async (branchId: string, offset: number = 0, limit: number = 10): Promise<ApiListResponse<Stock>> => {
        try {
            const api = await getServerApi();
            const response = await api.get('/stocks', {
                params: { branchId, offset, limit }
            });
            return response.data;
        } catch (error: any) {
            return { error: 'Erro ao buscar estoques da unidade', data: [] };
        }
    },

    /**
     * Busca estoques por produto
     */
    getStocksByProduct: async (productId: string, offset: number = 0, limit: number = 10): Promise<ApiListResponse<Stock>> => {
        try {
            const api = await getServerApi();
            const response = await api.get('/stocks', {
                params: { productId, offset, limit }
            });
            return response.data;
        } catch (error: any) {
            return { error: 'Erro ao buscar estoques do produto', data: [] };
        }
    },

    /**
     * Busca estoques por filial e produto
     */
    getStockByBranchAndProduct: async (branchId: string, productId: string): Promise<ApiResponse<Stock>> => {
        try {
            const api = await getServerApi();
            const response = await api.get('/stocks', {
                params: { branchId, productId }
            });
            return response.data;
        } catch (error: any) {
            return { error: error.response?.data?.error || 'Erro ao buscar estoque específico', data: null };
        }
    },

    /**
     * Busca estoques com baixa quantidade (estoque mínimo)
     */
    getLowStockItems: async (branchId?: string): Promise<ApiListResponse<Stock>> => {
        try {
            const api = await getServerApi();
            const params: any = { lowStock: true };
            if (branchId) params.branchId = branchId;
            
            const response = await api.get('/stocks', { params });
            return response.data;
        } catch (error: any) {
            return { error: 'Erro ao buscar itens com baixo estoque', data: [] };
        }
    },

    /**
     * Busca produtos que estão com estoque zerado
     */
    getOutOfStockItems: async (branchId?: string): Promise<ApiListResponse<Stock>> => {
        try {
            const api = await getServerApi();
            const params: any = { outOfStock: true };
            if (branchId) params.branchId = branchId;
            
            const response = await api.get('/stocks', { params });
            return response.data;
        } catch (error: any) {
            return { error: 'Erro ao buscar itens sem estoque', data: [] };
        }
    }
};