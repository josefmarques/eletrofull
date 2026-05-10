import { getClientApi } from "@/lib/client-api";

export const branchClientService = {
  getBranches: async () => {
    try {
      const api = getClientApi();
      const response = await api.get('/branches');
      return response.data;
    } catch {
      return { data: [] };
    }
  },
};
