import { getServerApi } from "@/lib/server-api";

export const authService = {
    getMe: async () => {
        try {
            const api = await getServerApi();
            // O backend não tem prefixo /api, as rotas são montadas diretamente
            const response = await api.get('/auth/me');
            return response.data;
        } catch (error: any) {
            console.error('[authService.getMe] Error:', error.message);
            // Retorna objeto com data: null para que o dashboard possa verificar
            return { error: error.response?.data?.error || 'Erro ao buscar dados do usuário', data: null };
        }
    }
};
