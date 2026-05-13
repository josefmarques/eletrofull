"use client";

import { Printer } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PrintItemData {
  quantity: number;
  productName: string;
  unitPrice: string | number;
  subtotal: string | number;
}

export interface PrintPaymentData {
  method: string;
  amount: string | number;
}

export interface PrintDocumentData {
  /** "sale" = Recibo de Venda | "quote" = Orçamento */
  type: "sale" | "quote";
  id: string;
  receiptNumber?: number;
  branchName?: string;
  customerName?: string;
  sellerName?: string;
  userName?: string;
  createdAt?: string | null;
  expiresAt?: string | null;
  grossValue: string | number;
  discount: string | number;
  totalValue: string | number;
  paymentMethod?: string;
  payments?: PrintPaymentData[];
  items: PrintItemData[];
  observations?: string | null;
  /** Nº de dias de validade (exibido apenas em orçamentos) */
  validityDays?: number;
}

interface PrintDocumentProps {
  data: PrintDocumentData;
  /**
   * Se true, renderiza dentro de um modal overlay com botão imprimir/fechar.
   * Se false, renderiza o conteúdo diretamente inline (para páginas dedicadas).
   */
  modal?: boolean;
  onClose?: () => void;
  onPrint?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const COMPANY_NAME =
  process.env.NEXT_PUBLIC_COMPANY_NAME || "SISTEMA DE GESTÃO";

function fmtBR(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

function dataHoraBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function dataBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

const METHOD_LABEL: Record<string, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  credit: "Cartão de Crédito",
  credit_card: "Cartão de Crédito",
  debit: "Cartão de Débito",
  debit_card: "Cartão de Débito",
  transfer: "Transferência",
  orcamento: "Orçamento Convertido",
};

// ─── Document Content (usado tanto no preview quanto no print) ───────────────

function DocumentContent({ data }: { data: PrintDocumentData }) {
  const isQuote = data.type === "quote";
  const subtotal = data.items.reduce(
    (acc, item) => acc + parseFloat(String(item.subtotal)),
    0,
  );

  return (
    <div className="print-area max-w-[210mm] mx-auto bg-white text-black">
      {/* ══════════ Cabeçalho ══════════ */}
      <div className="text-center border-b-2 border-black pb-4 mb-4">
        <h1 className="text-xl font-bold tracking-wide uppercase">
          {COMPANY_NAME}
        </h1>
        <p className="text-sm mt-1">Sistema de Gestão</p>
        {data.branchName && (
          <p className="text-xs text-gray-600 mt-0.5">{data.branchName}</p>
        )}
        {isQuote && (
          <p className="text-sm font-bold mt-2 text-red-600 border border-red-600 inline-block px-3 py-0.5">
            ORÇAMENTO — NÃO É RECIBO DE VENDA
          </p>
        )}
      </div>

      {/* ══════════ Informações do Documento ══════════ */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold shrink-0">
            {isQuote ? "Orçamento nº:" : "Recibo nº:"}
          </span>
          <span>
            {isQuote
              ? data.id.substring(0, 8).toUpperCase()
              : String(data.receiptNumber || "").padStart(6, "0")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold shrink-0">Emissão:</span>
          <span>{dataHoraBR(data.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold shrink-0">Cliente:</span>
          <span>{data.customerName || "Consumidor Final"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold shrink-0">Vendedor:</span>
          <span>{data.sellerName || data.userName || "—"}</span>
        </div>

        {/* Validade (apenas orçamento) */}
        {isQuote && data.expiresAt && (
          <>
            <div className="flex items-center gap-2">
              <span className="font-semibold shrink-0">Validade:</span>
              <span>{dataBR(data.expiresAt)}</span>
            </div>
            {data.validityDays && (
              <div className="flex items-center gap-2">
                <span className="font-semibold shrink-0">Válido por:</span>
                <span>{data.validityDays} dia(s)</span>
              </div>
            )}
          </>
        )}

        {/* Observações */}
        {data.observations && (
          <div className="col-span-2 flex items-start gap-2 mt-1">
            <span className="font-semibold shrink-0">Obs:</span>
            <span className="text-gray-600">{data.observations}</span>
          </div>
        )}
      </div>

      {/* ══════════ Tabela de Itens ══════════ */}
      <table className="w-full text-sm border-collapse mb-4">
        <thead>
          <tr className="border-y-2 border-black">
            <th className="py-1.5 text-left w-[8%]">Qtd</th>
            <th className="py-1.5 text-left">Descrição</th>
            <th className="py-1.5 text-right w-[20%]">Valor Unit.</th>
            <th className="py-1.5 text-right w-[18%]">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-300">
              <td className="py-1.5 text-center font-medium">
                {item.quantity}
              </td>
              <td className="py-1.5">{item.productName}</td>
              <td className="py-1.5 text-right tabular-nums">
                {fmtBR(item.unitPrice)}
              </td>
              <td className="py-1.5 text-right font-semibold tabular-nums">
                {fmtBR(item.subtotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ══════════ Totais ══════════ */}
      <div className="flex justify-end mb-4">
        <div className="w-[280px] space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Valor Bruto</span>
            <span className="tabular-nums">{fmtBR(data.grossValue)}</span>
          </div>
          {Number(data.discount) > 0 && (
            <div className="flex justify-between text-red-700">
              <span>Desconto</span>
              <span className="tabular-nums">— {fmtBR(data.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t-2 border-black pt-1 mt-1">
            <span>Total</span>
            <span className="tabular-nums">{fmtBR(data.totalValue)}</span>
          </div>
        </div>
      </div>

      {/* ══════════ Pagamento (apenas recibo de venda) ══════════ */}
      {!isQuote && data.paymentMethod && (
        <div className="border-t-2 border-black pt-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">Forma de Pagamento:</span>
            <span>
              {data.payments && data.payments.length > 1
                ? "Misto (ver detalhes abaixo)"
                : data.payments && data.payments.length === 1
                  ? METHOD_LABEL[data.payments[0].method] ||
                    data.payments[0].method
                  : METHOD_LABEL[data.paymentMethod] || data.paymentMethod}
            </span>
          </div>
          {data.payments && data.payments.length > 1 && (
            <div className="ml-4 mt-1 space-y-0.5 text-xs text-gray-600">
              {data.payments.map((p, i) => (
                <div key={i} className="flex justify-between max-w-[250px]">
                  <span>{METHOD_LABEL[p.method] || p.method}</span>
                  <span className="tabular-nums">{fmtBR(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════ Observação legal (apenas orçamento) ══════════ */}
      {isQuote && (
        <div className="border-t border-gray-300 pt-3 mb-4 text-xs text-gray-500">
          <p>
            Este é um <strong>ORÇAMENTO</strong> e não constitui recibo de
            venda. Os preços e condições são válidos até a data de validade
            informada. Após o vencimento, consulte-nos para revalidação.
          </p>
        </div>
      )}

      {/* ══════════ Rodapé ══════════ */}
      <div className="text-center text-xs text-gray-500 border-t border-gray-300 pt-3 mt-4">
        <p>Obrigado pela preferência!</p>
        <p className="mt-0.5">{COMPANY_NAME} — Sistema de Gestão</p>
        <p className="mt-1 text-[10px] text-gray-400">
          ID: {data.id}
        </p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 🖨️  PrintDocument — Componente Reutilizável
// ═════════════════════════════════════════════════════════════════════════════
//
// Uso em páginas de venda:
//   <PrintDocument data={saleData} />
//
// Uso em páginas de orçamento (com preview modal):
//   <PrintDocument data={quoteData} preview onClose={...} onPrint={...} />
// ═════════════════════════════════════════════════════════════════════════════

export default function PrintDocument({
  data,
  modal,
  onClose,
  onPrint,
}: PrintDocumentProps) {
  const content = <DocumentContent data={data} />;

  return (
    <>
      {/* ── Modal overlay (exibido em tela, escondido no print) ── */}
      {modal ? (
        <div className="fixed inset-0 z-50 bg-white overflow-auto print:hidden">
          <div className="flex justify-between items-center p-4 bg-gray-100 border-b">
            <h2 className="text-lg font-bold">
              {data.type === "quote"
                ? "Visualizar / Imprimir Orçamento"
                : "Visualizar / Imprimir Recibo"}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={onPrint || (() => window.print())}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                <Printer className="h-4 w-4" /> Imprimir
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent"
                >
                  Fechar
                </button>
              )}
            </div>
          </div>
          <div className="p-4 md:p-8 lg:p-12">{content}</div>
        </div>
      ) : (
        /* ── Renderização inline (para páginas dedicadas, ex: /sales/[id]/print) ── */
        <div className="print:hidden">{content}</div>
      )}

      {/* ── Print-only (escondido em tela, visível apenas no print) ── */}
      <div className="print-report-container hidden">{content}</div>

      {/* ── Print Styles ── */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
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
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
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
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
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
