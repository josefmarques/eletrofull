import { getClientApi } from "@/lib/client-api";
import { QuoteData } from "@/types/sale";
import { ApiListResponse, ApiResponse } from "@/types/api";

export const quoteService = {
    /**
     * Cria um novo orçamento (sem baixar estoque)
     */
    createQuote: async (data: {
        branchId: string;
        customerId?: string;
        sellerId?: string;
        grossValue: string | number;
        totalValue: string | number;
        discount?: string | number;
        observations?: string;
        items: Array<{
            productId: string;
            quantity: number;
            unitPrice: string | number;
            subtotal: string | number;
            name?: string;
        }>;
    }): Promise<ApiResponse<QuoteData>> => {
        try {
            const api = getClientApi();
            const response = await api.post('/quotes', data);
            return response.data;
        } catch (error: any) {
            const msg = error.response?.data?.detail
                || error.response?.data?.error
                || 'Erro ao criar orçamento';
            return { error: typeof msg === 'string' ? msg : 'Erro ao criar orçamento', data: null };
        }
    },

    /**
     * Lista orçamentos
     */
    getQuotes: async (params?: {
        branchId?: string;
        sellerId?: string;
        status?: string;
        offset?: number;
        limit?: number;
    }): Promise<ApiListResponse<QuoteData>> => {
        try {
            const api = getClientApi();
            const response = await api.get('/quotes', { params });
            return response.data;
        } catch (error: any) {
            return { error: 'Erro ao buscar orçamentos', data: [] };
        }
    },

    /**
     * Busca um orçamento por ID
     */
    getQuoteById: async (id: string): Promise<ApiResponse<QuoteData>> => {
        try {
            const api = getClientApi();
            const response = await api.get(`/quotes/${id}`);
            return response.data;
        } catch (error: any) {
            return { error: error.response?.data?.error || 'Erro ao buscar orçamento', data: null };
        }
    },

    /**
     * Converte orçamento em venda (baixa estoque, gera financeiro)
     */
    convertQuote: async (id: string): Promise<ApiResponse<{ sale: any; quote: QuoteData }>> => {
        try {
            const api = getClientApi();
            const response = await api.post(`/quotes/${id}/convert`);
            return response.data;
        } catch (error: any) {
            const msg = error.response?.data?.detail
                || error.response?.data?.error
                || 'Erro ao converter orçamento';
            return { error: typeof msg === 'string' ? msg : 'Erro ao converter orçamento', data: null };
        }
    },

    /**
     * Cancela um orçamento
     */
    cancelQuote: async (id: string): Promise<ApiResponse<QuoteData>> => {
        try {
            const api = getClientApi();
            const response = await api.post(`/quotes/${id}/cancel`);
            return response.data;
        } catch (error: any) {
            const msg = error.response?.data?.detail
                || error.response?.data?.error
                || 'Erro ao cancelar orçamento';
            return { error: typeof msg === 'string' ? msg : 'Erro ao cancelar orçamento', data: null };
        }
    },
};
