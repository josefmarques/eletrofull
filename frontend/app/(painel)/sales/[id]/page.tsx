"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageTitle } from "@/components/page-title";
import { saleService } from "@/services/sale";
import { branchClientService } from "@/services/branch-client";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";

export default function SaleDetailPage() {
  const params = useParams();
  const [sale, setSale] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [saleRes, branchesRes] = await Promise.all([
        saleService.getSaleById(params.id as string),
        branchClientService.getBranches(),
      ]);
      setSale(saleRes?.data || null);
      setBranches(branchesRes?.data || []);
      setLoading(false);
    };
    load();
  }, [params.id]);

  const getBranchName = (id: string) => {
    return branches.find((b) => b.id === id)?.name || "—";
  };

  const methodLabel: Record<string, string> = {
    cash: "Dinheiro",
    credit_card: "Cartão de Crédito",
    debit_card: "Cartão de Débito",
    pix: "PIX",
    transfer: "Transferência",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Venda não encontrada.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sales">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <PageTitle title={`Venda #${String(sale.receiptNumber || "").padStart(6, "0")}`} />
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Informações da Venda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Filial</span>
              <span className="font-medium">
                {getBranchName(sale.branchId)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Operador</span>
              <span className="font-medium">{sale.userName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">
                {sale.customerName || "Consumidor Final"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data</span>
              <span className="font-medium">
                {new Date(sale.createdAt).toLocaleDateString("pt-BR")} às{" "}
                {new Date(sale.createdAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pagamento</span>
              <Badge variant="outline">
                {(() => {
                  const methods = sale.payments;
                  if (methods && methods.length > 1) return "Misto";
                  if (methods && methods.length === 1)
                    return methodLabel[methods[0].method] || methods[0].method;
                  return methodLabel[sale.paymentMethod] || sale.paymentMethod;
                })()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor Bruto</span>
              {/* CORRIGIDO COM Number() */}
              <span className="font-medium">
                R$ {Number(sale.grossValue || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Desconto</span>
              {/* CORRIGIDO COM Number() */}
              <span className="font-medium text-red-500">
                — R$ {Number(sale.discount || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total Líquido</span>
              {/* CORRIGIDO COM Number() */}
              <span>R$ {Number(sale.totalValue || 0).toFixed(2)}</span>
            </div>

            {/* Composição dos pagamentos */}
            {sale.payments && sale.payments.length > 0 && (
              <div className="border-t pt-2 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Composição do Pagamento
                </p>
                {sale.payments.map((p: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{methodLabel[p.method] || p.method}</span>
                    <span className="font-medium">
                      R$ {Number(p.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Itens da Venda ({sale.items?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Qtd</TableHead>
                <TableHead className="text-right">Preço Unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items?.map((item: any, idx: number) => (
                <TableRow key={item.id || idx}>
                  <TableCell>{item.productName || item.productId}</TableCell>

                  {/* COLUNA DA QUANTIDADE DE VOLTA */}
                  <TableCell className="text-center">{item.quantity}</TableCell>

                  <TableCell className="text-right">
                    R$ {Number(item.unitPrice).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    R$ {Number(item.subtotal).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground">
        ID da venda: {sale.id}
      </div>
    </div>
  );
}
