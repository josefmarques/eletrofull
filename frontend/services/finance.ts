import { getClientApi } from "@/lib/client-api";
import type { FinancialTransaction, FinanceSummary, FinanceListResponse, FinanceSummaryResponse, FinancePayResponse } from "@/types/finance";

export const financeService = {
  /**
   * GET /finance — Lista transações financeiras com filtros.
   */
  list: async (params?: {
    tenantId?: string;
    status?: string;
    tipo?: string;
    startDate?: string;
    endDate?: string;
    branchId?: string;
    limit?: number;
    offset?: number;
  }): Promise<FinanceListResponse> => {
    try {
      const api = getClientApi();
      const response = await api.get("/finance", { params });
      return response.data;
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || "Erro ao listar transações",
        data: [],
        total: 0,
        limit: params?.limit || 50,
        offset: params?.offset || 0,
      };
    }
  },

  /**
   * GET /finance/summary — Resumo do dashboard financeiro.
   */
  summary: async (params?: {
    tenantId?: string;
    branchId?: string;
  }): Promise<FinanceSummaryResponse> => {
    try {
      const api = getClientApi();
      const response = await api.get("/finance/summary", { params });
      return response.data;
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || "Erro ao buscar resumo financeiro",
        data: {
          totalRecebido: "0",
          totalPago: "0",
          saldoAtual: "0",
          aReceber: "0",
          aPagar: "0",
        },
      };
    }
  },

  /**
   * PATCH /finance/{id}/pay — Baixa um título financeiro.
   */
  pay: async (id: string): Promise<FinancePayResponse> => {
    try {
      const api = getClientApi();
      const response = await api.patch(`/finance/${id}/pay`);
      return response.data;
    } catch (error: any) {
      return {
        error: error.response?.data?.detail || "Erro ao baixar título",
        message: "",
        data: null as unknown as FinancialTransaction,
      };
    }
  },
};
