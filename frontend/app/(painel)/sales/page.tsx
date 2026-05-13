"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageTitle } from "@/components/page-title";
import { saleService } from "@/services/sale";
import { branchClientService } from "@/services/branch-client";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, ArrowUpDown, Eye, Printer } from "lucide-react";
import Link from "next/link";

export default function SalesPage() {
    const [sales, setSales] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [branchFilter, setBranchFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const fetchSales = async () => {
        setLoading(true);
        const params: any = { limit: 50 };
        if (branchFilter) params.branchId = branchFilter;
        if (dateFrom) params.startDate = dateFrom;
        if (dateTo) params.endDate = dateTo;

        const [salesRes, branchesRes] = await Promise.all([
            saleService.getSales(0, 50),
            branchClientService.getBranches(),
        ]);
        setSales(salesRes?.data || []);
        setBranches(branchesRes?.data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchSales();
    }, []);

    const filteredSales = sales.filter((s) => {
        if (branchFilter && s.branchId !== branchFilter) return false;
        if (dateFrom && new Date(s.createdAt) < new Date(dateFrom)) return false;
        if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            if (new Date(s.createdAt) > end) return false;
        }
        return true;
    });

    const getBranchName = (id: string) => {
        return branches.find((b) => b.id === id)?.name || id.slice(0, 8) + "...";
    };

    // Nome da unidade para o titulo dinamico
    const pageTitleBranchName = branchFilter
        ? getBranchName(branchFilter)
        : "Todas as Unidades";

    const methodLabel: Record<string, string> = {
        cash: "Dinheiro",
        credit_card: "Cartão Crédito",
        debit_card: "Cartão Débito",
        pix: "PIX",
        transfer: "Transferência",
    };

    return (
        <div className="space-y-6">
            <PageTitle title={`Histórico de Vendas - ${pageTitleBranchName}`} />

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Filter className="h-4 w-4" /> Filtros
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Unidade</label>
                            <select
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                value={branchFilter}
                                onChange={(e) => setBranchFilter(e.target.value)}
                            >
                                <option value="">Todas as unidades</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">De</label>
                            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Até</label>
                            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchSales}>
                            <Search className="h-4 w-4 mr-1" /> Buscar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
                    ) : filteredSales.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">Nenhuma venda encontrada.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Unidade</TableHead>
                                    <TableHead>Operador</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                    <TableHead>Pagamento</TableHead>
                                    <TableHead className="text-center">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSales.map((sale) => (
                                    <TableRow key={sale.id}>
                                        <TableCell className="text-sm">
                                            {new Date(sale.createdAt).toLocaleDateString("pt-BR")}
                                            <br />
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(sale.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </TableCell>
                                        <TableCell>{getBranchName(sale.branchId)}</TableCell>
                                        <TableCell>{sale.userName || "—"}</TableCell>
                                        <TableCell>{sale.customerName || "Consumidor Final"}</TableCell>
                                        <TableCell className="text-right font-semibold">
                                            R$ {sale.totalValue.toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                            {(() => {
                                                const methods = sale.payments;
                                                if (methods && methods.length > 1) {
                                                    return "Misto";
                                                }
                                                if (methods && methods.length === 1) {
                                                    return methodLabel[methods[0].method] || methods[0].method;
                                                }
                                                return methodLabel[sale.paymentMethod] || sale.paymentMethod;
                                            })()}
                                        </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Link href={`/sales/${sale.id}`}>
                                                    <Button variant="ghost" size="icon" title="Detalhes">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Link href={`/sales/${sale.id}/print`}>
                                                    <Button variant="ghost" size="icon" title="Imprimir Recibo">
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
