import { getServerApi } from "@/lib/server-api";

export const branchService = {
  getBranches: async () => {
    const api = await getServerApi();
    try {
      const response = await api.get('/branches');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar filiais:', error);
      return { data: [] };
    }
  }
};
