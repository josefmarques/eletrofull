import { getClientApi } from "@/lib/client-api";
import { Customer } from "@/types/sale";
import { ApiListResponse, ApiResponse } from "@/types/api";

export const customerService = {
    /**
     * Busca clientes por nome ou CPF/CNPJ
     */
    searchCustomers: async (searchTerm?: string): Promise<ApiListResponse<Customer>> => {
        try {
            const api = getClientApi();
            const params: Record<string, any> = {};
            if (searchTerm) params.name = searchTerm;
            
            console.log('[CustomerService] Searching customers:', { searchTerm, url: '/customers' });
            const response = await api.get('/customers', { params });
            console.log('[CustomerService] Search result:', response.data);
            return response.data;
        } catch (error: any) {
            console.error("[CustomerService] Error searching customers:", {
                 url: '/customers',
                 params: { searchTerm },
                 error: error.message,
                 response: error.response?.data
             });
            return { error: 'Erro ao buscar clientes', data: [] };
        }
    },

    /**
     * Busca detalhes de um cliente específico
     */
    getCustomerById: async (id: string): Promise<ApiResponse<Customer>> => {
        try {
            const api = getClientApi();
            console.log('[CustomerService] Getting customer by id:', { id });
            const response = await api.get(`/customers/${id}`);
            return response.data;
        } catch (error: any) {
            console.error("[CustomerService] Error getting customer:", {
                id,
                error: error.message,
                response: error.response?.data
            });
            return { error: error.response?.data?.error || 'Erro ao buscar cliente', data: null };
        }
    },

    /**
     * Cria um novo cliente (para cadastro rápido no PDV)
     */
    createCustomer: async (data: Partial<Customer>): Promise<ApiResponse<Customer>> => {
        try {
            const api = getClientApi();
            console.log('[CustomerService] Creating customer:', data);
            const response = await api.post('/customers', data);
            return response.data;
        } catch (error: any) {
            console.error("[CustomerService] Error creating customer:", {
                data,
                error: error.message,
                response: error.response?.data
            });
            return { error: error.response?.data?.error || 'Erro ao criar cliente', data: null };
        }
    }
};
