"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageTitle } from "@/components/page-title";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { auditService } from "@/services/audit";
import type { AuditLogEntry, AuditAction } from "@/services/audit";
import {
  Search,
  Filter,
  Eye,
  Loader2,
  RotateCcw,
  ArrowRight,
  Hash,
  Clock,
  User as UserIcon,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constantes ─────────────────────────────────────────────────────────────

const ENTITY_NAMES = [
  "Product",
  "Category",
  "User",
  "Branch",
  "Stock",
  "Move",
  "Sale",
  "Customer",
  "CashSession",
  "Payment",
] as const;

const ACTION_CONFIG: Record<
  AuditAction,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }
> = {
  CREATE: {
    label: "Criação",
    variant: "default",
    color: "bg-green-500/10 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  },
  UPDATE: {
    label: "Atualização",
    variant: "secondary",
    color: "bg-amber-500/10 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  },
  DELETE: {
    label: "Exclusão",
    variant: "destructive",
    color: "bg-red-500/10 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  },
};

const ENTITY_LABEL: Record<string, string> = {
  Product: "Produto",
  Category: "Categoria",
  User: "Usuário",
  Branch: "Filial",
  Stock: "Estoque",
  Move: "Movimentação",
  Sale: "Venda",
  Customer: "Cliente",
  CashSession: "Sessão de Caixa",
  Payment: "Pagamento",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("pt-BR"),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

/** Conjunto de chaves que armazenam valores monetários em centavos (int) */
const PRICE_KEYS = new Set([
  "unit_price",
  "cost_price",
  "unitValue",
  "unitCost",
  "total_value",
  "totalValue",
  "unit_cost",
  "price",
  "amount",
  "discount_amount",
  "opening_balance",
  "closing_balance",
  "totalSales",
  "totalDeposits",
  "totalWithdrawals",
  "expectedBalance",
]);

/** Formata moeda brasileira (Intl). */
const currencyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Formata um valor do log de auditoria para exibição humana.
 * - Chaves de preço (centavos) → R$ 35,50
 * - Booleanos → Sim / Não
 * - Objetos → JSON string
 * - Demais → string direta
 */
function formatAuditValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";

  // Preços armazenados em centavos no banco (int)
  if (PRICE_KEYS.has(key) && typeof value === "number") {
    return currencyFmt.format(value / 100);
  }
  // Preços que porventura cheguem como string numerica
  if (PRICE_KEYS.has(key) && typeof value === "string" && !isNaN(Number(value))) {
    return currencyFmt.format(Number(value) / 100);
  }

  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Filtra chaves irrelevantes para a exibição do auditor. */
function isKeyVisible(key: string): boolean {
  // Oculta UUIDs de chaves estrangeiras (category_id, branch_id, user_id…)
  if (key.endsWith("_id")) return false;
  // Oculta metadados internos
  if (key.startsWith("id") || key === "created_at" || key === "updated_at" || key === "deleted_at") return false;
  return true;
}

function fieldLabel(key: string): string {
  const map: Record<string, string> = {
    name: "Nome",
    email: "E-mail",
    unit_price: "Preço Unitário",
    unit_type: "Unidade",
    category_id: "Categoria",
    quantity: "Quantidade",
    minimum_quantity: "Qtd. Mínima",
    maximum_quantity: "Qtd. Máxima",
    is_admin: "Admin",
    branch_id: "Filial",
    password: "Senha",
    avatar: "Avatar",
    description: "Descrição",
    unit_cost: "Custo Unitário",
    unitValue: "Valor Unitário",
  };
  return map[key] || key;
}

// ─── Componente de Diff ────────────────────────────────────────────────────

function DiffViewer({
  oldValues,
  newValues,
  action,
}: {
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  action: AuditAction;
}) {
  // CREATE: mostra apenas novos valores (filtra chaves _id)
  if (action === "CREATE" && newValues) {
    const entries = Object.entries(newValues).filter(([k]) => isKeyVisible(k));
    if (entries.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-4">Nenhum campo relevante registrado.</p>;
    }
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">
          ✓ Valores Criados
        </p>
        <div className="rounded-lg border border-green-200 bg-green-50/30 dark:bg-green-950/10 divide-y">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground font-medium">
                {fieldLabel(key)}
              </span>
              <span className="font-semibold text-green-700 dark:text-green-400">
                {formatAuditValue(key, value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // DELETE: mostra apenas valores antigos (filtra chaves _id)
  if (action === "DELETE" && oldValues) {
    const entries = Object.entries(oldValues).filter(([k]) => isKeyVisible(k));
    if (entries.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-4">Nenhum campo relevante registrado.</p>;
    }
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">
          ✗ Valores Removidos
        </p>
        <div className="rounded-lg border border-red-200 bg-red-50/30 dark:bg-red-950/10 divide-y">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground font-medium">
                {fieldLabel(key)}
              </span>
              <span className="font-semibold text-red-600 line-through">
                {formatAuditValue(key, value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // UPDATE: mostra De → Para
  if (action === "UPDATE" && oldValues && newValues) {
    // Pega as chaves visíveis em ambos os dicionários
    const allKeys = new Set([
      ...Object.keys(oldValues),
      ...Object.keys(newValues),
    ]);
    const changedEntries: { key: string; oldVal: unknown; newVal: unknown }[] =
      [];

    allKeys.forEach((key) => {
      if (!isKeyVisible(key)) return;
      const oldVal = key in oldValues ? oldValues[key] : undefined;
      const newVal = key in newValues ? newValues[key] : undefined;
      changedEntries.push({ key, oldVal, newVal });
    });

    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
          ⟷ Alterações Detectadas
        </p>
        <div className="rounded-lg border divide-y">
          {changedEntries.map(({ key, oldVal, newVal }) => {
            const changed =
              JSON.stringify(oldVal) !== JSON.stringify(newVal);
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm",
                  changed && "bg-amber-50/50 dark:bg-amber-950/10"
                )}
              >
                {/* Label do campo */}
                <span className="text-muted-foreground font-medium w-1/3 shrink-0">
                  {fieldLabel(key)}
                </span>

                {/* Valor Antigo */}
                <span
                  className={cn(
                    "flex-1 px-2 py-0.5 rounded text-right",
                    changed
                      ? "bg-red-50 text-red-600 line-through dark:bg-red-950/20"
                      : "text-muted-foreground"
                  )}
                >
                  {formatAuditValue(key, oldVal)}
                </span>

                {/* Seta */}
                {changed && (
                  <ArrowRight className="h-4 w-4 shrink-0 text-amber-500" />
                )}
                {!changed && (
                  <span className="w-4 shrink-0" />
                )}

                {/* Valor Novo */}
                <span
                  className={cn(
                    "flex-1 px-2 py-0.5 rounded text-right font-semibold",
                    changed
                      ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
                      : "text-foreground"
                  )}
                >
                  {formatAuditValue(key, newVal)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground text-center py-4">
      Nenhum dado disponível para exibição.
    </p>
  );
}

// ─── Modal de Detalhes ──────────────────────────────────────────────────────

function AuditDetailModal({
  entry,
  open,
  onOpenChange,
}: {
  entry: AuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!entry) return null;

  const { date, time } = formatDateTime(entry.createdAt);
  const actionCfg = ACTION_CONFIG[entry.action];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Detalhes da Auditoria
          </DialogTitle>
          <DialogDescription>
            Registro completo da ação realizada no sistema.
          </DialogDescription>
        </DialogHeader>

        {/* Cabeçalho com metadados */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border text-sm">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Data / Hora
            </p>
            <p className="font-medium">
              {date} às {time}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <UserIcon className="h-3 w-3" /> Usuário
            </p>
            <p className="font-medium">{entry.userName}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Hash className="h-3 w-3" /> Entidade
            </p>
            <p className="font-medium">
              {ENTITY_LABEL[entry.entityName] || entry.entityName}
              <span className="text-muted-foreground ml-1 text-xs">
                #{entry.entityId.slice(0, 8)}
              </span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Ação</p>
            <Badge
              variant={actionCfg.variant}
              className={actionCfg.color}
            >
              {actionCfg.label}
            </Badge>
          </div>
        </div>

        {/* Separador */}
        <div className="border-t" />

        {/* Visualizador de Diff */}
        <DiffViewer
          oldValues={entry.oldValues}
          newValues={entry.newValues}
          action={entry.action}
        />

        {/* ID completo do registro ao final */}
        <p className="text-[10px] text-muted-foreground text-right pt-2 border-t">
          Audit ID: {entry.id}
        </p>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página Principal ──────────────────────────────────────────────────────

export default function AuditoriaPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Estados de filtro (lidos da URL)
  const [entityNameFilter, setEntityNameFilter] = useState(
    searchParams.get("entityName") || ""
  );
  const [actionFilter, setActionFilter] = useState(
    searchParams.get("action") || ""
  );
  const [startDate, setStartDate] = useState(
    searchParams.get("startDate") || ""
  );
  const [endDate, setEndDate] = useState(
    searchParams.get("endDate") || ""
  );

  // Estados de dados
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de detalhes
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);

  // Paginação
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 25;
  const offset = (page - 1) * limit;
  const totalPages = Math.ceil(total / limit);

  // ── Atualiza URL com filtros ──────────────────────────────────────────────
  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (entityNameFilter) params.set("entityName", entityNameFilter);
    if (actionFilter) params.set("action", actionFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("page", "1"); // reseta para página 1 ao filtrar
    router.push(`${pathname}?${params.toString()}`);
  }, [entityNameFilter, actionFilter, startDate, endDate, router, pathname]);

  // ── Busca dados ───────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await auditService.getAuditLogs({
      entityName: entityNameFilter || undefined,
      action: (actionFilter as AuditAction) || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit,
      offset,
    });

    if (result.error) {
      setError(result.error);
      setLogs([]);
      setTotal(0);
    } else {
      setLogs(result.data);
      setTotal(result.total);
    }
    setLoading(false);
  }, [entityNameFilter, actionFilter, startDate, endDate, offset]);

  // Recarrega quando a página ou filtros mudam (via URL)
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Sincroniza filtros quando a URL muda (navegação via paginação)
  useEffect(() => {
    setEntityNameFilter(searchParams.get("entityName") || "");
    setActionFilter(searchParams.get("action") || "");
    setStartDate(searchParams.get("startDate") || "");
    setEndDate(searchParams.get("endDate") || "");
  }, [searchParams]);

  // ── Handlers de navegação ─────────────────────────────────────────────────
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearFilters = () => {
    setEntityNameFilter("");
    setActionFilter("");
    setStartDate("");
    setEndDate("");
    router.push(pathname);
  };

  const handleViewDetails = (entry: AuditLogEntry) => {
    setSelectedEntry(entry);
    setModalOpen(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const hasActiveFilters = !!(entityNameFilter || actionFilter || startDate || endDate);

  return (
    <div className="space-y-6">
      <PageTitle title="Auditoria" />

      {/* ─── Painel de Filtros ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            {/* Filtro por Entidade */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Entidade</label>
              <Select
                value={entityNameFilter}
                onValueChange={setEntityNameFilter}
              >
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {ENTITY_NAMES.map((name) => (
                    <SelectItem key={name} value={name}>
                      {ENTITY_LABEL[name] || name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Ação */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Ação</label>
              <Select
                value={actionFilter}
                onValueChange={setActionFilter}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="CREATE">Criação</SelectItem>
                  <SelectItem value="UPDATE">Atualização</SelectItem>
                  <SelectItem value="DELETE">Exclusão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Data Início */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">De</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-[160px]"
              />
            </div>

            {/* Filtro por Data Fim */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Até</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 w-[160px]"
              />
            </div>

            {/* Botões */}
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={applyFilters}
                className="h-9"
              >
                <Search className="h-4 w-4 mr-1" /> Filtrar
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-9"
                >
                  <RotateCcw className="h-4 w-4 mr-1" /> Limpar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Tabela de Logs ─── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Carregando logs de auditoria...
            </div>
          ) : error ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-destructive font-medium">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchLogs}>
                Tentar novamente
              </Button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-lg font-medium">
                {hasActiveFilters
                  ? "Nenhum log encontrado"
                  : "Nenhum registro de auditoria"}
              </p>
              <p className="text-sm mt-1">
                {hasActiveFilters
                  ? "Tente ajustar os filtros para encontrar resultados."
                  : "Os logs aparecerão aqui conforme ações forem realizadas no sistema."}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-4" onClick={handleClearFilters}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Limpar Filtros
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Data / Hora</TableHead>
                    <TableHead className="w-[180px]">Usuário</TableHead>
                    <TableHead className="w-[110px]">Ação</TableHead>
                    <TableHead className="w-[120px]">Entidade</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Registro
                    </TableHead>
                    <TableHead className="text-center w-[80px]">
                      Detalhes
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((entry) => {
                    const { date, time } = formatDateTime(entry.createdAt);
                    const actionCfg = ACTION_CONFIG[entry.action];
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          <span className="font-medium">{date}</span>
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {time}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <UserIcon className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="text-sm font-medium truncate max-w-[130px]">
                              {entry.userName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={actionCfg.variant}
                            className={cn(actionCfg.color, "font-medium")}
                          >
                            {actionCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {ENTITY_LABEL[entry.entityName] || entry.entityName}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                            {entry.entityId.slice(0, 8)}...
                          </code>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(entry)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* ─── Rodapé com estatísticas e paginação ─── */}
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                <p>
                  {total > 0
                    ? `${offset + 1}–${Math.min(offset + limit, total)} de ${total} registro(s)`
                    : "Nenhum registro"}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="text-xs font-medium px-2">
                    {page} / {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Modal de Detalhes ─── */}
      <AuditDetailModal
        entry={selectedEntry}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
