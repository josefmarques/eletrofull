import { getServerApi } from "@/lib/server-api";

export const userService = {
    getUsers: async (
        offset: number = 0,
        limit: number = 10,
        includeInactive: boolean = false
    ) => {
        try {
            const api = await getServerApi();
            const response = await api.get('/users', {
                params: { 
                    offset, 
                    limit,
                    includeInactive: includeInactive ? 'true' : 'false'
                }
            });
            return response.data;
        } catch (error) {
            return { error: 'Erro ao buscar usuários', data: null };
        }
    },

    getUserById: async (id: string) => {
        try {
            const api = await getServerApi();
            const response = await api.get(`/users/${id}`);
            return response.data;
        } catch (error) {
            return { error: 'Erro ao buscar usuário', data: null };
        }
    }
};
