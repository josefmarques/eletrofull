export interface FinancialTransaction {
  id: string;
  tenantId: string;
  branchId: string;
  descricao: string;
  valor: string;
  tipo: "revenue" | "expense";
  tipoLabel: "Entrada" | "Saída";
  status: "pending" | "paid" | "canceled";
  statusLabel: "Pendente" | "Pago" | "Cancelado";
  categoria: string;
  vencimento: string | null;
  dataPagamento: string | null;
  saleId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface FinanceSummary {
  totalRecebido: string;
  totalPago: string;
  saldoAtual: string;
  aReceber: string;
  aPagar: string;
}

export interface FinanceListResponse {
  error: string | null;
  data: FinancialTransaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface FinanceSummaryResponse {
  error: string | null;
  data: FinanceSummary;
}

export interface FinancePayResponse {
  error: string | null;
  message: string;
  data: FinancialTransaction;
}
