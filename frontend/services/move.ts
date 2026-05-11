import { getServerApi } from "@/lib/server-api";
import { MovePayload } from "@/types/move";

/**
 * Serviço responsável pela comunicação com o backend para gestão de movimentações.
 * Utiliza o getServerApi para garantir a comunicação interna via rede Docker.
 */
export const moveService = {
    /**
     * Busca o histórico de movimentações.
     * Permite filtragem por produto e, crucialmente, por filial (branchId).
     */
    getMoves: async (offset: number = 0, limit: number = 10, productId?: string, branchId?: string) => {
        try {
            const api = await getServerApi();
            
            // Parâmetros de consulta para paginação e filtros
            const params: Record<string, string | number | undefined> = { 
                offset, 
                limit, 
                productId, 
                branchId 
            };

            const response = await api.get('/moves', { params });
            
            // Retorna os dados formatados do backend
            return response.data;
        } catch (error: any) {
            console.error('[moveService.getMoves] Error:', error.response?.data || error.message);
            return { 
                error: error.response?.data?.error || 'Erro ao buscar movimentações', 
                data: [] 
            };
        }
    },

    /**
     * Registra uma nova movimentação de estoque (Entrada ou Saída).
     * O objeto 'data' deve conter: productId, branchId, type e quantity.
     */
    createMove: async (data: MovePayload) => {
        try {
            const api = await getServerApi();

            // Enviamos o payload completo para o backend.
            // O branchId é fundamental para que o backend saiba qual estoque de filial atualizar.
            // Garantimos que quantity seja number (o backend espera number após correção do validator)
            const response = await api.post('/moves', {
                productId: data.productId,
                branchId: data.branchId,
                type: data.type,
                quantity: Number(data.quantity),
                description: data.description || undefined,
            });

            return response.data;
        } catch (error: any) {
            console.error('[moveService.createMove] Error:', error.response?.data || error.message);
            return { 
                error: error.response?.data?.error || 'Erro ao registrar movimentação', 
                data: null 
            };
        }
    }
};