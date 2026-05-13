"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { saleService } from "@/services/sale";
import PrintDocument from "@/components/print-document";
import type { PrintDocumentData } from "@/components/print-document";

// ─── Loading / Print Skeleton ──────────────────────────────────────────────

function PrintSkeleton() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// ─── Helper: converte resposta da API para PrintDocumentData ───────────────

function toPrintData(sale: any): PrintDocumentData {
  return {
    type: "sale",
    id: sale.id,
    receiptNumber: sale.receiptNumber,
    branchName: sale.branchName || undefined,
    customerName: sale.customerName || undefined,
    sellerName: sale.sellerName || undefined,
    userName: sale.userName || undefined,
    createdAt: sale.createdAt,
    grossValue: sale.grossValue || 0,
    discount: sale.discount || 0,
    totalValue: sale.totalValue || 0,
    paymentMethod: sale.paymentMethod,
    payments: sale.payments?.map((p: any) => ({
      method: p.method,
      amount: p.amount,
    })),
    items: (sale.items || []).map((item: any) => ({
      quantity: item.quantity,
      productName: item.productName || item.productId,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
  };
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function SalePrintPage() {
  const params = useParams();
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    saleService
      .getSaleById(params.id as string)
      .then((res) => {
        if (res.error || !res.data) {
          setError(res.error || "Venda não encontrada");
        } else {
          setSale(res.data);
        }
      })
      .catch(() => setError("Erro ao carregar venda"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <PrintSkeleton />;

  if (error || !sale) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
        <p>{error || "Venda não encontrada."}</p>
        <Link href="/sales">
          <Button variant="outline">
            <ArrowLeft className="size-4 mr-2" /> Voltar
          </Button>
        </Link>
      </div>
    );
  }

  const printData = toPrintData(sale);

  return (
    <>
      {/* ── UI Controls (hidden on print) ── */}
      <div className="no-print flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/sales/${params.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">
              Recibo — Venda #
              {String(sale.receiptNumber || "").padStart(6, "0")}
            </h1>
            <p className="text-sm text-muted-foreground">
              Pré-visualização para impressão
            </p>
          </div>
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Loader2 className="size-4 hidden" /> Imprimir
        </Button>
      </div>

      {/* ── Preview inline na tela ── */}
      <div className="p-4 md:p-8 lg:p-12 border rounded-xl bg-white">
        <PrintDocument data={printData} />
      </div>
    </>
  );
}
