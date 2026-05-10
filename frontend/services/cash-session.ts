import { getClientApi } from "@/lib/client-api";

export const cashSessionService = {
  openSession: async (branchId: string, openingBalance: string) => {
    try {
      const api = getClientApi();
      const response = await api.post('/cash-sessions', { branchId, openingBalance });
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Erro ao abrir caixa', data: null };
    }
  },

  closeSession: async (id: string, closingBalance: string, observations?: string) => {
    try {
      const api = getClientApi();
      const response = await api.post(`/cash-sessions/${id}/close`, { closingBalance, observations });
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Erro ao fechar caixa', data: null };
    }
  },

  getCurrentSession: async (branchId: string) => {
    try {
      const api = getClientApi();
      const response = await api.get(`/cash-sessions/current?branchId=${branchId}`);
      return response.data;
    } catch {
      return { data: null };
    }
  },

  listSessions: async (branchId: string) => {
    try {
      const api = getClientApi();
      const response = await api.get(`/cash-sessions?branchId=${branchId}`);
      return response.data;
    } catch {
      return { data: [] };
    }
  },

  addWithdrawal: async (id: string, amount: string, description?: string) => {
    try {
      const api = getClientApi();
      const response = await api.post(`/cash-sessions/${id}/withdrawal`, { amount, description });
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Erro ao registrar sangria', data: null };
    }
  },

  addDeposit: async (id: string, amount: string, description?: string) => {
    try {
      const api = getClientApi();
      const response = await api.post(`/cash-sessions/${id}/deposit`, { amount, description });
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Erro ao registrar aporte', data: null };
    }
  },

  getSessionReport: async (id: string) => {
    try {
      const api = getClientApi();
      const response = await api.get(`/cash-sessions/${id}/report`);
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Erro ao buscar relatório', data: null };
    }
  },
};
