import { getServerApi } from "@/lib/server-api";
import { ApiListResponse } from "@/types/api";

export const saleItemService = {
    /**
     * Busca todos os itens de venda com paginação
     */
    getSaleItems: async (offset: number = 0, limit: number = 10): Promise<ApiListResponse<any>> => {
        try {
            const api = await getServerApi();
            const response = await api.get('/sale-items', {
                params: { offset, limit }
            });
            return response.data;
        } catch (error: any) {
            return { error: 'Erro ao buscar itens de venda', data: [] };
        }
    },

    /**
     * Busca itens de venda por venda
     */
    getSaleItemsBySale: async (saleId: string): Promise<ApiListResponse<any>> => {
        try {
            const api = await getServerApi();
            const response = await api.get('/sale-items', {
                params: { saleId }
            });
            return response.data;
        } catch (error: any) {
            return { error: 'Erro ao buscar itens da venda', data: [] };
        }
    },

    /**
     * Busca itens de venda por produto
     */
    getSaleItemsByProduct: async (productId: string, offset: number = 0, limit: number = 10): Promise<ApiListResponse<any>> => {
        try {
            const api = await getServerApi();
            const response = await api.get('/sale-items', {
                params: { productId, offset, limit }
            });
            return response.data;
        } catch (error: any) {
            return { error: 'Erro ao buscar itens do produto', data: [] };
        }
    },

    /**
     * Busca itens de venda por unidade
     */
    getSaleItemsByBranch: async (branchId: string, offset: number = 0, limit: number = 10): Promise<ApiListResponse<any>> => {
        try {
            const api = await getServerApi();
            const response = await api.get('/sale-items', {
                params: { branchId, offset, limit }
            });
            return response.data;
        } catch (error: any) {
            return { error: 'Erro ao buscar itens da unidade', data: [] };
        }
    }
};
