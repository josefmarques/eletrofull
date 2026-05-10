import { getServerApi } from "@/lib/server-api";
import { InventoryValue, MovesSummary, MoveGraphItem } from "@/types/dashboard";
import { Product } from "@/types/product";
import { ApiResponse, ApiListResponse } from "@/types/api";

export const dashboardService = {
    getInventoryValue: async (branchId?: string): Promise<ApiResponse<InventoryValue>> => {
        try {
            const api = await getServerApi();
            const response = await api.get('/dashboard/inventory-value', {
                params: { branchId } // Passamos o branchId como query string
            });
            return response.data;
        } catch (error) {
            return { error: 'Erro ao buscar valor do estoque', data: null };
        }
    },

    getMovesSummary: async (startDate?: string, endDate?: string, branchId?: string): Promise<ApiResponse<MovesSummary>> => {
        try {
            const api = await getServerApi();
            const response = await api.get('/dashboard/moves-summary', {
                params: { startDate, endDate, branchId }
            });
            return response.data;
        } catch (error) {
            return { error: 'Erro ao buscar resumo de movimentações', data: null };
        }
    },

    getMovesGraph: async (startDate?: string, endDate?: string, branchId?: string): Promise<ApiListResponse<MoveGraphItem>> => {
        try {
            const api = await getServerApi();
            const response = await api.get('/dashboard/moves-graph', {
                params: { startDate, endDate, branchId }
            });
            return response.data;
        } catch (error) {
            return { error: 'Erro ao buscar gráfico de movimentações', data: [] };
        }
    },

    getLowStock: async (branchId?: string): Promise<ApiListResponse<Product>> => {
        try {
            const api = await getServerApi();
            const response = await api.get('/dashboard/low-stock', {
                params: { branchId }
            });
            return response.data;
        } catch (error) {
            return { error: 'Erro ao buscar produtos com estoque baixo', data: [] };
        }
    },

    getStagnantProducts: async (startDate?: string, endDate?: string, branchId?: string): Promise<ApiListResponse<Product>> => {
        try {
            const api = await getServerApi();
            const response = await api.get('/dashboard/stagnant-products', {
                params: { startDate, endDate, branchId }
            });
            return response.data;
        } catch (error) {
            return { error: 'Erro ao buscar produtos estagnados', data: [] };
        }
    }
};