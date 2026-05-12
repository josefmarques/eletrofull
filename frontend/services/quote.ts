import { getClientApi } from "@/lib/client-api";
import { QuoteData } from "@/types/sale";
import { ApiListResponse, ApiResponse } from "@/types/api";

export const quoteService = {
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
                || 'Erro ao criar orcamento';
            return { error: typeof msg === 'string' ? msg : 'Erro ao criar orcamento', data: null };
        }
    },

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
            return { error: 'Erro ao buscar orcamentos', data: [] };
        }
    },

    getQuoteById: async (id: string): Promise<ApiResponse<QuoteData>> => {
        try {
            const api = getClientApi();
            const response = await api.get(`/quotes/${id}`);
            return response.data;
        } catch (error: any) {
            return { error: error.response?.data?.error || 'Erro ao buscar orcamento', data: null };
        }
    },

    convertQuote: async (id: string): Promise<ApiResponse<{ sale: { id: string; totalValue: string; receiptNumber: number }; quote: QuoteData }>> => {
        try {
            const api = getClientApi();
            const response = await api.post(`/quotes/${id}/convert`);
            return response.data;
        } catch (error: any) {
            const msg = error.response?.data?.detail
                || error.response?.data?.error
                || 'Erro ao converter orcamento';
            return { error: typeof msg === 'string' ? msg : 'Erro ao converter orcamento', data: null };
        }
    },

    cancelQuote: async (id: string): Promise<ApiResponse<QuoteData>> => {
        try {
            const api = getClientApi();
            const response = await api.post(`/quotes/${id}/cancel`);
            return response.data;
        } catch (error: any) {
            const msg = error.response?.data?.detail
                || error.response?.data?.error
                || 'Erro ao cancelar orcamento';
            return { error: typeof msg === 'string' ? msg : 'Erro ao cancelar orcamento', data: null };
        }
    },
};
