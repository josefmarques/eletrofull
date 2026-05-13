"use client";

import { useState, useEffect, useCallback } from "react";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { quoteService } from "@/services/quote";
import { QuoteData } from "@/types/sale";
import { cn, formatDateTimeBR } from "@/lib/utils";
import {
    FileText,
    RefreshCw,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    Loader2,
    Printer,
    ArrowRight,
    User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PrintDocument from "@/components/print-document";
import type { PrintDocumentData } from "@/components/print-document";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    pendente: { label: "Pendente", color: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400", icon: Clock },
    aprovado: { label: "Aprovado", color: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400", icon: CheckCircle },
    cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-400", icon: XCircle },
};

function QuotePrintView({ quote, onClose }: { quote: QuoteData; onClose: () => void }) {
    // Calcula validade em dias a partir da data de criação
    let validityDays: number | undefined;
    if (quote.createdAt && quote.expiresAt) {
        const created = new Date(quote.createdAt);
        const expires = new Date(quote.expiresAt);
        const diffMs = expires.getTime() - created.getTime();
        validityDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    }

    const printData: PrintDocumentData = {
        type: "quote",
        id: quote.id,
        branchName: undefined,
        customerName: quote.customerName || undefined,
        sellerName: quote.sellerName || undefined,
        userName: quote.userName || undefined,
        createdAt: quote.createdAt,
        expiresAt: quote.expiresAt,
        grossValue: quote.grossValue,
        discount: quote.discount,
        totalValue: quote.totalValue,
        items: quote.items.map((item) => ({
            quantity: item.quantity,
            productName: item.productName || item.productId.substring(0, 8),
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
        })),
        observations: quote.observations,
        validityDays,
    };

    return (
        <PrintDocument
            data={printData}
            modal
            onClose={onClose}
            onPrint={() => window.print()}
        />
    );
}

export default function QuotesPage() {
    const router = useRouter();
    const { addToast } = useToast();
    const [quotes, setQuotes] = useState<QuoteData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("pendente");
    const [convertingId, setConvertingId] = useState<string | null>(null);
    const [cancelId, setCancelId] = useState<string | null>(null);
    const [printQuote, setPrintQuote] = useState<QuoteData | null>(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);

    const fetchQuotes = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { limit: 50 };
            if (filter) params.status = filter;
            const res = await quoteService.getQuotes(params);
            setQuotes(res.data || []);
        } catch {
            setQuotes([]);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchQuotes();
    }, [fetchQuotes]);

    const handleConvert = (id: string) => {
        // Redireciona para o PDV com o quote_id para carregar os itens
        router.push(`/pdv?quote_id=${id}`);
    };

    const handleCancel = async () => {
        if (!cancelId) return;
        try {
            const res = await quoteService.cancelQuote(cancelId);
            if (res.error) {
                addToast({ title: "Erro ao cancelar", description: res.error, type: "error" });
            } else {
                addToast({ title: "Orçamento cancelado", type: "success" });
                fetchQuotes();
            }
        } catch (err: any) {
            addToast({ title: "Erro", description: err.message, type: "error" });
        } finally {
            setCancelId(null);
            setShowCancelDialog(false);
        }
    };

    const isExpired = (quote: QuoteData) => {
        if (quote.expiresAt && quote.status === "pendente") {
            return new Date(quote.expiresAt) < new Date();
        }
        return false;
    };

    const formatCurrency = (value: string) => {
        return `R$ ${parseFloat(value).toFixed(2)}`;
    };

    if (printQuote) {
        return <QuotePrintView quote={printQuote} onClose={() => setPrintQuote(null)} />;
    }

    return (
        <div className="space-y-6">
            <PageTitle
                title="Orçamentos / Propostas"
                rightSide={
                    <Link href="/pdv">
                        <Button variant="outline" size="sm">
                            <FileText className="h-4 w-4 mr-2" /> Novo no PDV
                        </Button>
                    </Link>
                }
            />

            {/* Filtros */}
            <div className="flex gap-2 flex-wrap">
                {[
                    { value: "", label: "Todos" },
                    { value: "pendente", label: "Pendentes" },
                    { value: "aprovado", label: "Aprovados" },
                    { value: "cancelado", label: "Cancelados" },
                ].map((opt) => (
                    <Button
                        key={opt.value}
                        variant={filter === opt.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter(opt.value)}
                    >
                        {opt.label}
                    </Button>
                ))}
                <div className="flex-1" />
                <Button variant="ghost" size="icon" onClick={fetchQuotes} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
            </div>

            {/* Lista */}
            {loading ? (
                <div className="flex items-center justify-center p-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando...
                </div>
            ) : quotes.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                        <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-lg font-medium">Nenhum orçamento encontrado</p>
                        <p className="text-sm mt-1">Crie orçamentos no PDV</p>
                        <Link href="/pdv">
                            <Button className="mt-4" variant="outline">Ir para o PDV</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="border rounded-lg bg-background overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="font-semibold">#ID</TableHead>
                                <TableHead className="font-semibold">Cliente</TableHead>
                                <TableHead className="hidden md:table-cell font-semibold">Vendedor</TableHead>
                                <TableHead className="text-right font-semibold">Valor</TableHead>
                                <TableHead className="text-center font-semibold">Status</TableHead>
                                <TableHead className="hidden lg:table-cell font-semibold">Data</TableHead>
                                <TableHead className="text-right font-semibold w-[200px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quotes.map((quote) => {
                                const statusCfg = STATUS_CONFIG[quote.status] || STATUS_CONFIG.pendente;
                                const StatusIcon = statusCfg.icon;
                                const expired = isExpired(quote);
                                return (
                                    <TableRow key={quote.id} className={cn(
                                        expired && "opacity-60",
                                        quote.status === "aprovado" && "bg-green-50/30 dark:bg-green-950/10",
                                    )}>
                                        <TableCell className="font-mono text-xs">
                                            {quote.id.substring(0, 8).toUpperCase()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                <span>{quote.customerName || "Consumidor"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                            {quote.sellerName || "—"}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {formatCurrency(quote.totalValue)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={cn("gap-1", statusCfg.color)}>
                                                <StatusIcon className="h-3 w-3" />
                                                {statusCfg.label}
                                                {expired && <AlertTriangle className="h-3 w-3 ml-1" />}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                                            {formatDateTimeBR(quote.createdAt || "")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-1 justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => setPrintQuote(quote)}
                                                    title="Visualizar / Imprimir"
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                                {quote.status === "pendente" && !expired && (
                                                    <>
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className="h-8 text-xs"
                                                            disabled={convertingId === quote.id}
                                                            onClick={() => handleConvert(quote.id)}
                                                        >
                                                            {convertingId === quote.id ? (
                                                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                                            ) : (
                                                                <ArrowRight className="h-3 w-3 mr-1" />
                                                            )}
                                                            Converter
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                                            onClick={() => { setCancelId(quote.id); setShowCancelDialog(true); }}
                                                            title="Cancelar"
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    <div className="px-4 py-3 border-t text-sm text-muted-foreground">
                        Total: {quotes.length} orçamento(s)
                    </div>
                </div>
            )}

            {/* Dialog de cancelamento */}
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancelar Orçamento?</DialogTitle>
                        <DialogDescription>
                            Esta ação não pode ser desfeita. O orçamento será marcado como cancelado.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                            Voltar
                        </Button>
                        <Button variant="destructive" onClick={handleCancel}>
                            Sim, Cancelar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
