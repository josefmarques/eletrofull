import { getClientApi } from "@/lib/client-api";

// ─── Tipos ─────────────────────────────────────────────────────────────────

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

export type AuditLogEntry = {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  entityName: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
};

export type AuditLogsResponse = {
  error: string | null;
  data: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
};

export type AuditLogsParams = {
  userId?: string;
  entityName?: string;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

// ─── Service ───────────────────────────────────────────────────────────────

export const auditService = {
  /**
   * Busca registros do log de auditoria.
   * A rota é protegida — apenas admins têm acesso (o backend valida).
   */
  getAuditLogs: async (
    params: AuditLogsParams = {}
  ): Promise<AuditLogsResponse> => {
    try {
      const api = getClientApi();

      // Monta os query params ignorando undefined/null
      const queryParams: Record<string, unknown> = {};
      if (params.userId) queryParams.userId = params.userId;
      if (params.entityName) queryParams.entityName = params.entityName;
      if (params.action) queryParams.action = params.action;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.offset !== undefined) queryParams.offset = params.offset;

      const response = await api.get("/audit-logs", {
        params: queryParams,
      });

      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        "Erro ao carregar logs de auditoria";
      return {
        error: message,
        data: [],
        total: 0,
        limit: params.limit || 50,
        offset: params.offset || 0,
      };
    }
  },
};
