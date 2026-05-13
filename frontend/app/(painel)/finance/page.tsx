"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CheckCircle2,
  DollarSign,
  Filter,
  HandCoins,
  Loader2,
  Printer,
  Receipt,
  Search,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageTitle } from "@/components/page-title";
import { useToast } from "@/components/ui/toast";
import { financeService } from "@/services/finance";
import { branchClientService } from "@/services/branch-client";
import type { FinancialTransaction, FinanceSummary } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";

// ─── Helper: BRL Currency ──────────────────────────────────────────────────

function brl(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

// ─── Helper: Data BR ───────────────────────────────────────────────────────

function dataBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

// ─── Summary Card ──────────────────────────────────────────────────────────

function SummaryCard({
  title,
  value,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  variant?: "default" | "success" | "danger" | "warning";
}) {
  const valueColor = {
    default: "text-foreground",
    success: "text-green-600 dark:text-green-400",
    danger: "text-red-600 dark:text-red-400",
    warning: "text-amber-600 dark:text-amber-400",
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground tracking-tight">
            {title}
          </span>
          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="size-5 text-primary" />
          </div>
        </div>
        <div className={`text-2xl font-bold tracking-tight ${valueColor[variant]}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "ghost"; icon: React.ElementType }> = {
    paid: { label: "Pago", variant: "secondary", icon: CheckCircle2 },
    pending: { label: "Pendente", variant: "outline", icon: Loader2 },
    canceled: { label: "Cancelado", variant: "ghost", icon: XCircle },
  };
  const { label, variant, icon: Icon } = config[status] || config.pending;
  return (
    <Badge variant={variant} className="gap-1.5 font-medium">
      <Icon className="size-3.5" />
      {label}
    </Badge>
  );
}

// ─── Cash Closing Dialog ────────────────────────────────────────────────

function CashClosingDialog({
  transactions,
  summary,
  branches,
  brl: fmt,
  dataBR: dbr,
  getBranchName,
}: {
  transactions: FinancialTransaction[];
  summary: FinanceSummary | null;
  branches: { id: string; name: string }[];
  brl: (v: string | number) => string;
  dataBR: (iso: string | null | undefined) => string;
  getBranchName: (id: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [clientDate, setClientDate] = useState<{ todayStr: string; todayLabel: string } | null>(null);

  // Só calcula a data no cliente para evitar hydration mismatch
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const todayLabel = today.toLocaleDateString("pt-BR");
    setClientDate({ todayStr, todayLabel });
  }, []);

  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || "SISTEMA DE GESTÃO";

  // Enquanto a data do cliente não foi calculada, não renderiza o conteúdo
  if (!clientDate) {
    return (
      <>
        <Button variant="outline" className="gap-2" disabled>
          <Printer className="size-4" /> Imprimir Fechamento
        </Button>
      </>
    );
  }

  const { todayStr, todayLabel } = clientDate;

  // ── Data usa o summary do servidor (mais preciso) ──
  const totalRevenue = summary ? parseFloat(summary.totalRecebido) : 0;
  const totalExpense = summary ? parseFloat(summary.totalPago) : 0;
  const balance = summary ? parseFloat(summary.saldoAtual) : 0;

  // Filtra transações pagas hoje para a tabela
  const todayPaid = transactions.filter((t) => {
    if (t.status !== "paid" || !t.dataPagamento) return false;
    return t.dataPagamento.slice(0, 10) === todayStr;
  });

  // ── Conteúdo do relatório (reutilizado no modal e no print) ──
  const reportContent = (
    <div className="print-area">
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-3 mb-4">
        <h1 className="text-xl font-bold tracking-wide uppercase">
          {companyName}
        </h1>
        <p className="text-sm mt-1">Sistema de Gestão</p>
        <p className="text-sm font-semibold mt-1">
          Relatório de Fechamento de Caixa — {todayLabel}
        </p>
      </div>

      {/* Summary cards — usam dados do servidor */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="border-2 border-black p-3 text-center">
          <p className="text-xs uppercase tracking-wide mb-1">
            Entradas (Vendas)
          </p>
          <p className="text-xl font-bold tabular-nums">{fmt(totalRevenue)}</p>
        </div>
        <div className="border-2 border-black p-3 text-center">
          <p className="text-xs uppercase tracking-wide mb-1">
            Saídas (Despesas)
          </p>
          <p className="text-xl font-bold tabular-nums">{fmt(totalExpense)}</p>
        </div>
        <div className="border-2 border-black p-3 text-center">
          <p className="text-xs uppercase tracking-wide mb-1">
            Saldo Final
          </p>
          <p className="text-xl font-bold tabular-nums">{fmt(balance)}</p>
        </div>
      </div>

      {/* Totais Gerais */}
      {summary && (
        <div className="border border-gray-400 p-3 mb-4">
          <p className="text-xs font-bold uppercase tracking-wide mb-2">
            Totais Gerais
          </p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            <div className="flex justify-between border-b border-gray-300 pb-1">
              <span>Total Recebido</span>
              <span className="font-semibold tabular-nums">
                {fmt(summary.totalRecebido)}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-300 pb-1">
              <span>Total Pago</span>
              <span className="font-semibold tabular-nums">
                {fmt(summary.totalPago)}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-300 pb-1">
              <span>Saldo Atual</span>
              <span className="font-semibold tabular-nums">
                {fmt(summary.saldoAtual)}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-300 pb-1">
              <span>A Receber</span>
              <span className="font-semibold tabular-nums">
                {fmt(summary.aReceber)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Movimentações do Dia */}
      <h2 className="text-sm font-bold border-b-2 border-black pb-1 mb-2">
        Movimentações do Dia
      </h2>

      {todayPaid.length === 0 ? (
        <p className="text-sm italic">
          Nenhuma movimentação registrada hoje.
        </p>
      ) : (
        <table className="w-full text-sm border-collapse mb-4">
          <thead>
            <tr className="border-y-2 border-black">
              <th className="py-2 text-left">Data</th>
              <th className="py-2 text-left">Descrição</th>
              <th className="py-2 text-center">Tipo</th>
              <th className="py-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {todayPaid.map((tx) => (
              <tr key={tx.id} className="border-b border-gray-300">
                <td className="py-2">{dbr(tx.dataPagamento)}</td>
                <td className="py-2">{tx.descricao}</td>
                <td className="py-2 text-center">
                  {tx.tipo === "revenue" ? "Entrada" : "Saída"}
                </td>
                <td className="py-2 text-right font-medium tabular-nums">
                  {fmt(tx.valor)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-bold">
              <td colSpan={3} className="py-2 text-right">
                Total do Dia:
              </td>
              <td className="py-2 text-right tabular-nums">{fmt(balance)}</td>
            </tr>
          </tfoot>
        </table>
      )}

      {/* Signature */}
      <div className="signature-section mt-8 pt-4 border-t border-gray-300">
        <div className="grid grid-cols-2 gap-16">
          <div>
            <p className="text-sm mb-8">Operador / Vendedor</p>
            <div className="border-b border-black h-6" />
            <p className="text-xs text-center mt-1">Assinatura</p>
          </div>
          <div>
            <p className="text-sm mb-8">Gerente</p>
            <div className="border-b border-black h-6" />
            <p className="text-xs text-center mt-1">Assinatura</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs border-t border-gray-300 pt-3 mt-6">
        <p>
          {companyName} — Sistema de Gestão — Relatório gerado em{" "}
          {todayLabel}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Modal de Pré-visualização ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Printer className="size-4" /> Imprimir Fechamento
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pré-visualização — Fechamento de Caixa</DialogTitle>
            <DialogDescription>
              Confira os dados do dia {todayLabel} antes de imprimir.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">{reportContent}</div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="size-4" /> Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Print-only section (fora do Dialog, visível apenas no print) ── */}
      <div className="print-report-container hidden">
        {reportContent}
      </div>

      {/* ── Print Styles ── */}
      <style jsx global>{`
        @media print {
          /* Oculta tudo o que não é o relatório usando visibility */
          body * {
            visibility: hidden !important;
          }

          /* Força a exibição apenas do container de impressão e seus filhos */
          .print-report-container,
          .print-report-container * {
            visibility: visible !important;
          }

          .print-report-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Força texto preto para evitar que cores claras sumam na impressão */
          .print-report-container * {
            color: black !important;
            background: transparent !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }

          .print-report-container .print-area {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Tabelas sem quebra */
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          .signature-section {
            page-break-inside: avoid;
          }

          @page {
            margin: 15mm;
            size: A4;
          }
        }
      `}</style>
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function FinancePage() {
  const { addToast } = useToast();

  // ── Data State ──
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // ── Filter State ──
  const [filters, setFilters] = useState({
    status: "",
    tipo: "",
    branchId: "",
    startDate: "",
    endDate: "",
  });

  // ── Pagination ──
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  // ── Fetch Data ──
  const fetchData = useCallback(async (resetOffset = true) => {
    setLoading(true);
    const currentOffset = resetOffset ? 0 : offset;

    const params: Record<string, string | number> = { limit: LIMIT };
    if (resetOffset) setOffset(0);
    else params.offset = currentOffset;
    if (filters.status) params.status = filters.status;
    if (filters.tipo) params.tipo = filters.tipo;
    if (filters.branchId) params.branchId = filters.branchId;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    const [listRes, summaryRes, branchesRes] = await Promise.all([
      financeService.list(params),
      financeService.summary({
        branchId: filters.branchId || undefined,
      }),
      branchClientService.getBranches(),
    ]);

    if (!listRes.error) {
      setTransactions(listRes.data);
      setTotal(listRes.total);
    }
    if (!summaryRes.error && summaryRes.data) {
      setSummary(summaryRes.data);
    }
    if (branchesRes?.data) {
      setBranches(branchesRes.data);
    }
    setLoading(false);
  }, [filters, offset]);

  useEffect(() => {
    fetchData();
  }, []);

  // ── Handle Filter Change ──
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchData(true);
  };

  // ── Handle Pay ──
  const handlePay = async (id: string) => {
    setPayingId(id);
    try {
      const result = await financeService.pay(id);
      if (result.error) {
        addToast({
          title: "Erro ao baixar título",
          description: result.error,
          type: "error",
        });
      } else {
        addToast({
          title: "Título baixado com sucesso!",
          description: result.message || "O pagamento foi registrado.",
          type: "success",
        });
        // Revalida dados
        fetchData(false);
      }
    } catch {
      addToast({
        title: "Erro inesperado",
        description: "Não foi possível processar a baixa.",
        type: "error",
      });
    } finally {
      setPayingId(null);
    }
  };

  // ── Compute today's total ──
  const todayTotal = transactions
    .filter((t) => {
      if (!t.dataPagamento) return false;
      const today = new Date();
      const payDate = new Date(t.dataPagamento);
      return (
        payDate.getDate() === today.getDate() &&
        payDate.getMonth() === today.getMonth() &&
        payDate.getFullYear() === today.getFullYear()
      );
    })
    .reduce((acc, t) => {
      const val = parseFloat(t.valor);
      return t.tipo === "revenue" ? acc + val : acc - val;
    }, 0);

  // ── Branch name helper ──
  const getBranchName = (id: string) =>
    branches.find((b) => b.id === id)?.name || id.slice(0, 8) + "…";

  return (
    <div className="space-y-6">
      <PageTitle title="Fluxo de Caixa" />

      {/* ── Close Report Trigger ── */}
      <div className="flex justify-end no-print">
        <CashClosingDialog
          transactions={transactions}
          summary={summary}
          branches={branches}
          brl={brl}
          dataBR={dataBR}
          getBranchName={getBranchName}
        />
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Saldo em Caixa"
          value={summary ? brl(summary.saldoAtual) : "—"}
          icon={Banknote}
          variant={
            summary
              ? parseFloat(summary.saldoAtual) >= 0
                ? "success"
                : "danger"
              : "default"
          }
        />
        <SummaryCard
          title="A Receber"
          value={summary ? brl(summary.aReceber) : "—"}
          icon={ArrowDownCircle}
          variant="warning"
        />
        <SummaryCard
          title="A Pagar"
          value={summary ? brl(summary.aPagar) : "—"}
          icon={ArrowUpCircle}
          variant="danger"
        />
        <SummaryCard
          title="Total do Dia"
          value={brl(todayTotal)}
          icon={HandCoins}
          variant={todayTotal >= 0 ? "success" : "danger"}
        />
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="size-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select
                value={filters.status}
                onValueChange={(v) => handleFilterChange("status", v)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="canceled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tipo</label>
              <Select
                value={filters.tipo}
                onValueChange={(v) => handleFilterChange("tipo", v)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="revenue">Entrada</SelectItem>
                  <SelectItem value="expense">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Unidade</label>
              <Select
                value={filters.branchId}
                onValueChange={(v) => handleFilterChange("branchId", v)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Unidades</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">De</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Até</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="h-9"
              />
            </div>

            <Button variant="outline" size="sm" onClick={applyFilters}>
              <Search className="size-4 mr-1" /> Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Transactions Table ── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-6 animate-spin mr-2" />
              Carregando transações…
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Receipt className="size-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma transação financeira encontrada.</p>
              <p className="text-xs mt-1">
                As transações são geradas automaticamente ao finalizar vendas.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        {dataBR(tx.vencimento)}
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate">
                        {tx.descricao}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize font-normal">
                          {tx.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getBranchName(tx.branchId)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${
                            tx.tipo === "revenue"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {tx.tipo === "revenue" ? (
                            <ArrowDownCircle className="size-4" />
                          ) : (
                            <ArrowUpCircle className="size-4" />
                          )}
                          {brl(tx.valor)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status} />
                      </TableCell>
                      <TableCell className="text-center">
                        {tx.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePay(tx.id)}
                            disabled={payingId === tx.id}
                            className="gap-1.5"
                          >
                            {payingId === tx.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="size-3.5 text-green-600" />
                            )}
                            {payingId === tx.id ? "Baixando…" : "Confirmar Pagamento"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* ── Pagination ── */}
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Mostrando {offset + 1}–{Math.min(offset + LIMIT, total)} de {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => {
                      const newOffset = Math.max(0, offset - LIMIT);
                      setOffset(newOffset);
                      fetchData(false);
                    }}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset + LIMIT >= total}
                    onClick={() => {
                      const newOffset = offset + LIMIT;
                      setOffset(newOffset);
                      fetchData(false);
                    }}
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
