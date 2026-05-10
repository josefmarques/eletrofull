import { getServerApi } from "@/lib/server-api";

export const categoryService = {
    getAllCategories: async (includeProductCount: boolean = false) => {
        try {
            const api = await getServerApi();
            const response = await api.get('/categories', {
                params: { includeProductCount }
            });
            return response.data;
        } catch (error) {
            return { error: 'Erro ao buscar categorias', data: null };
        }
    },

    getCategoryById: async (id: string) => {
        try {
            const api = await getServerApi();
            const response = await api.get(`/categories/${id}`);
            return response.data;
        } catch (error) {
            return { error: 'Erro ao buscar categoria', data: null };
        }
    }
};
