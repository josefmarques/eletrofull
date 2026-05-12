import { getClientApi } from "@/lib/client-api";
import { SaleResponse, CommissionReportItem } from "@/types/sale";
import { ApiListResponse, ApiResponse } from "@/types/api";

export const saleService = {
    createSale: async (data: any): Promise<ApiResponse<SaleResponse>> => {
        try {
            const api = getClientApi();
            const response = await api.post('/sales', data);
            return response.data;
        } catch (error: any) {
            return { error: error.response?.data?.error || 'Erro ao criar venda', data: null };
        }
    },

    getSales: async (offset: number = 0, limit: number = 10, params?: {
        branchId?: string;
        sellerId?: string;
    }): Promise<ApiListResponse<SaleResponse>> => {
        try {
            const api = getClientApi();
            const queryParams: any = { offset, limit };
            if (params?.branchId) queryParams.branchId = params.branchId;
            if (params?.sellerId) queryParams.sellerId = params.sellerId;
            const response = await api.get('/sales', { params: queryParams });
            return response.data;
        } catch (error: any) {
            return { error: 'Erro ao buscar vendas', data: [] };
        }
    },

    getSaleById: async (id: string): Promise<ApiResponse<SaleResponse>> => {
        try {
            const api = getClientApi();
            const response = await api.get(`/sales/${id}`);
            return response.data;
        } catch (error: any) {
            return { error: error.response?.data?.error || 'Erro ao buscar venda', data: null };
        }
    },

    getSalesByBranch: async (branchId: string, offset: number = 0, limit: number = 10): Promise<ApiListResponse<SaleResponse>> => {
        try {
            const api = getClientApi();
            const response = await api.get('/sales', {
                params: { branchId, offset, limit }
            });
            return response.data;
        } catch (error: any) {
            return { error: 'Erro ao buscar vendas da unidade', data: [] };
        }
    },

    /**
     * Relatório de comissões dos vendedores
     */
    getCommissions: async (params?: {
        startDate?: string;
        endDate?: string;
        sellerId?: string;
        branchId?: string;
    }): Promise<ApiListResponse<CommissionReportItem>> => {
        try {
            const api = getClientApi();
            const response = await api.get('/sales/commissions', { params });
            return response.data;
        } catch (error: any) {
            return { error: 'Erro ao buscar relatório de comissões', data: [] };
        }
    },

    /**
     * PDV Checkout — Finaliza venda pela Frente de Caixa Rápida.
     * Rota dedicada: POST /sales/checkout
     */
    pdvCheckout: async (data: {
        branch_id: string;
        customer_id?: string;
        seller_id?: string;
        payment_method: string;
        discount_amount?: string | number;
        items: Array<{
            product_id: string;
            quantity: number;
            unit_price: number;
        }>;
    }): Promise<ApiResponse<SaleResponse>> => {
        try {
            const api = getClientApi();
            const response = await api.post('/sales/checkout', data);
            return response.data;
        } catch (error: any) {
            const msg = error.response?.data?.detail || error.response?.data?.error || 'Erro ao finalizar venda';
            // 'detail' pode ser string ou objeto com 'message' e 'errors'
            if (typeof msg === 'string') {
                return { error: msg, data: null };
            }
            return { error: msg?.message || 'Erro ao finalizar venda', data: null };
        }
    },
};
