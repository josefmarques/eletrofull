"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSale } from "@/contexts/SaleContext";
import {
  Trash2,
  Plus,
  Minus,
  Search,
  User,
  UserPlus,
  Printer,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Building2,
  Banknote,
  QrCode,
  CreditCard,
  Landmark,
  Keyboard,
  BadgePercent,
  FileText,
  XCircle,
} from "lucide-react";
import { productService } from "@/services/product";
import { customerService } from "@/services/customer";
import { saleService } from "@/services/sale";
import { quoteService } from "@/services/quote";
import { cashSessionService } from "@/services/cash-session";
import { branchClientService } from "@/services/branch-client";
import { Product } from "@/types/product";
import { Customer, CommissionReportItem } from "@/types/sale";
import { User as UserType } from "@/types/user";
import { getClientApi } from "@/lib/client-api";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerQuickCreateDialog } from "@/components/products/customer-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn, formatDateTimeBR } from "@/lib/utils";
import { useSearchParams, useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";

// ─── Mapa de métodos de pagamento ───────────────────────────────────────────
const PAYMENT_METHODS = [
  { key: "cash", label: "Dinheiro", icon: Banknote, color: "bg-emerald-500 hover:bg-emerald-600" },
  { key: "pix", label: "PIX", icon: QrCode, color: "bg-sky-500 hover:bg-sky-600" },
  { key: "credit", label: "Crédito", icon: CreditCard, color: "bg-violet-500 hover:bg-violet-600" },
  { key: "debit", label: "Débito", icon: Landmark, color: "bg-amber-500 hover:bg-amber-600" },
] as const;

const METHOD_LABEL: Record<string, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  credit: "Cartão Crédito",
  debit: "Cartão Débito",
};

export default function PDVPage() {
  // ── Extrai branchId da URL (ex: /pdv?branch=uuid) ──
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlBranchId = searchParams.get("branch");
  const urlQuoteId = searchParams.get("quote_id");

  const {
    state,
    addItem,
    removeItem,
    updateQuantity,
    setCustomer,
    setDiscount,
    addPayment,
    removePayment,
    clearSale,
    subtotal,
    total,
    totalPaid,
    change,
    hasCashPayment,
  } = useSale();

  const { addToast } = useToast();
  const productInputRef = useRef<HTMLInputElement>(null);
  const userBranchFetched = useRef(false);

  // ── Estados ──
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [showCustomerPopover, setShowCustomerPopover] = useState(false);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);

  const [finalizing, setFinalizing] = useState(false);
  const [savingQuote, setSavingQuote] = useState(false);
  
  const [saleDone, setSaleDone] = useState<{
    id: string;
    total: number;
    receiptNumber: number;
    items: Array<{ productName: string; quantity: number; unitPrice: string; subtotal: string }>;
    payments: Array<{ method: string; amount: string }>;
    userName?: string;
    sellerName?: string;
  } | null>(null);

  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [hasOpenSession, setHasOpenSession] = useState<boolean | null>(null);

  // ── Dados do orçamento carregado ──
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteLoaded, setQuoteLoaded] = useState(false);
  const quoteLoadedRef = useRef(false);   // trava anti-loop

  // ── Vendedor responsável pela comissão ──
  const [sellers, setSellers] = useState<UserType[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [showSellerPopover, setShowSellerPopover] = useState(false);

  // Pagamento rápido — método selecionado e se o split está ativo
  const [quickPaymentMethod, setQuickPaymentMethod] = useState<string>("cash");
  const [showSplitPanel, setShowSplitPanel] = useState(false);
  const [splitAmount, setSplitAmount] = useState("");

  // ── Sincroniza estado do caixa ──
  useEffect(() => {
    if (!selectedBranchId) return;
    cashSessionService.getCurrentSession(selectedBranchId).then((r) => {
      setHasOpenSession(!!r?.data);
    });
  }, [selectedBranchId]);

  // ── Carrega dados do usuário ──
  useEffect(() => {
    if (userBranchFetched.current) return;
    userBranchFetched.current = true;
    const api = getClientApi();
    api
      .get("/auth/me")
      .then((res) => {
        const u = res.data?.data;
        setIsAdmin(u?.isAdmin === true);

        // REGRA: URL branchId tem prioridade ABSOLUTA sobre qualquer outro
        if (urlBranchId) {
          setSelectedBranchId(urlBranchId);
          setUserBranchId(u?.branchId || null);
        } else if (u?.branchId) {
          setUserBranchId(u.branchId);
          setSelectedBranchId(u.branchId);
        } else if (u?.isAdmin) {
          setUserBranchId(null);
          setHasOpenSession(null);
        } else {
          setHasOpenSession(null);
        }
      })
      .catch(() => {});
  }, []);

  // ── Carrega lista de unidades (SEMPRE, independente do perfil) ──
  useEffect(() => {
    let cancelled = false;
    branchClientService.getBranches().then((res) => {
      if (cancelled) return;
      const branchList = res?.data || [];
      setBranches(branchList);
    });
    return () => { cancelled = true; };
  }, []);

  // ── Admin sem URL branch: auto-seleciona primeira unidade ──
  useEffect(() => {
    if (isAdmin && !urlBranchId && branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [isAdmin, urlBranchId, branches, selectedBranchId]);

  // ── Busca de produtos (debounce 300ms) ──
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.trim().length >= 2) {
        setIsSearchingProducts(true);
        setSelectedProductIndex(0);
        const { data } = await productService.searchProducts(searchTerm, selectedBranchId || undefined);
        setSearchResults(data || []);
        setShowResults(true);
        setIsSearchingProducts(false);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, isAdmin, selectedBranchId, userBranchId]);

  // ── Busca de vendedores (role='vendedor') ──
  useEffect(() => {
    const fetchSellers = async () => {
      setLoadingSellers(true);
      try {
        const api = getClientApi();
        const response = await api.get('/users', {
          params: { limit: 100, includeInactive: false }
        });
        const allUsers: UserType[] = response.data?.data || [];
        // Filtra apenas vendedores
        const vendors = allUsers.filter(u => u.role === 'vendedor');
        setSellers(vendors);
        if (vendors.length === 1) {
          setSelectedSeller(vendors[0].id);
        }
      } catch (err) {
        console.error('[PDV] Error fetching sellers:', err);
      } finally {
        setLoadingSellers(false);
      }
    };
    fetchSellers();
  }, []);

  // ── Carrega dados do orçamento quando quote_id está na URL ──
  // usa ref como trava para rodar APENAS UMA VEZ, evitando loop infinito
  useEffect(() => {
    if (!urlQuoteId || quoteLoadedRef.current) return;
    quoteLoadedRef.current = true;  // trava: nunca mais roda
    
    const loadQuote = async () => {
      setLoadingQuote(true);
      try {
        const res = await quoteService.getQuoteById(urlQuoteId);
        if (res.error) {
          addToast({ title: "Erro ao carregar orçamento", description: res.error, type: "error" });
          return;
        }
        if (!res.data) return;

        const quote = res.data;
        
        // Limpa o carrinho atual
        clearSale();
        
        // Carrega cliente
        if (quote.customerId && quote.customerName) {
          setCustomer({
            id: quote.customerId,
            name: quote.customerName,
          });
        }
        
        // Carrega vendedor
        if (quote.sellerId) {
          setSelectedSeller(quote.sellerId);
        }
        
        // Carrega desconto
        if (quote.discount && parseFloat(quote.discount) > 0) {
          setDiscount(quote.discount);
        }
        
        // Carrega itens
        for (const item of quote.items) {
          addItem({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            name: item.productName || item.productId,
          });
        }
        
        setQuoteLoaded(true);
        addToast({
          title: "Orçamento carregado",
          description: `Itens de "${quote.customerName || 'Consumidor'}" foram carregados no carrinho.`,
          type: "success",
        });
      } catch (err: any) {
        addToast({ title: "Erro ao carregar orçamento", description: err.message, type: "error" });
      } finally {
        setLoadingQuote(false);
      }
    };
    
    loadQuote();
  }, [urlQuoteId]); // dependências mínimas: só urlQuoteId dispara; a ref trava re-execução

  // ── Busca de clientes ──
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (customerSearch.trim().length >= 3) {
        setIsSearchingCustomers(true);
        const { data } = await customerService.searchCustomers(customerSearch);
        setCustomerResults(data || []);
        setIsSearchingCustomers(false);
      } else {
        setCustomerResults([]);
        setIsSearchingCustomers(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // ── Salvar como Orcamento ──
  const handleSaveQuote = async () => {
    if (state.items.length === 0) {
      addToast({ title: "Carrinho vazio", type: "error" });
      return;
    }
    setSavingQuote(true);
    try {
      const payload = {
        branchId: selectedBranchId || "",
        customerId: state.customer?.id || undefined,
        sellerId: selectedSeller || undefined,
        grossValue: subtotal.toFixed(2),
        totalValue: total.toFixed(2),
        discount: parseFloat(state.discount) || 0,
        items: state.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice),
          subtotal: parseFloat(item.subtotal),
          name: item.name,
        })),
      };
      const res = await quoteService.createQuote(payload);
      if (res.error) {
        addToast({ title: "Erro ao salvar orçamento", description: res.error, type: "error" });
      } else {
        addToast({ title: "Orçamento gerado com sucesso!", type: "success" });
        clearSale();
        router.push('/quotes');
      }
    } catch (err: any) {
      addToast({ title: "Erro inesperado", description: err.message, type: "error" });
    } finally {
      setSavingQuote(false);
    }
  };

  // ── Auto-foco no input de busca ──
  useEffect(() => {
    if (!saleDone) {
      const t = setTimeout(() => productInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [saleDone, state.items.length]);

  // ── Keyboard Shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F9" && !e.repeat) {
        e.preventDefault();
        if (!finalizing && !saleDone && state.items.length > 0) {
          handleFinalizeRef.current();
        }
      }
      if (e.key === "Escape" && !e.repeat && state.items.length > 0 && !saleDone) {
        e.preventDefault();
        if (confirm("Limpar carrinho?")) {
          clearSale();
          productInputRef.current?.focus();
        }
      }
      if (e.key === "ArrowDown" && showResults && searchResults.length > 0) {
        e.preventDefault();
        setSelectedProductIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
      }
      if (e.key === "ArrowUp" && showResults && searchResults.length > 0) {
        e.preventDefault();
        setSelectedProductIndex((prev) => Math.max(prev - 1, 0));
      }
      if (e.key === "Enter" && showResults && searchResults.length > 0) {
        e.preventDefault();
        handleSelectProduct(searchResults[selectedProductIndex]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.items, finalizing, saleDone, showResults, searchResults, selectedProductIndex]);

    // ── Handlers ──

  const handleSelectProduct = (product: Product) => {
    const price = (product.unitPrice / 100).toFixed(2);
    addItem({
      productId: product.id,
      quantity: 1,
      unitPrice: price,
      subtotal: (1 * parseFloat(price)).toFixed(2),
      name: product.name,
    });
    setSearchTerm("");
    setSearchResults([]);
    setShowResults(false);
    productInputRef.current?.focus();
  };

  const handleSelectCustomer = (customer: Customer) => {
    setCustomer(customer);
    setCustomerSearch("");
    setCustomerResults([]);
    setShowCustomerPopover(false);
  };

  const handleCustomerCreated = (customer: Customer) => {
    setCustomer(customer);
    addToast({ title: "Cliente cadastrado", description: customer.name, type: "success" });
  };

  const handleQuantityChange = (productId: string, newQuantity: string) => {
    updateQuantity(productId, parseInt(newQuantity) || 0);
  };

  // ── Pagamento Rápido: adiciona método e finaliza ──
  const handleQuickPayAndFinalize = async (method: string) => {
    if (state.items.length === 0) {
      addToast({ title: "Carrinho vazio", description: "Adicione produtos primeiro.", type: "error" });
      return;
    }
    if (hasOpenSession === false && !isAdmin) {
      addToast({ title: "Caixa fechado", description: "Abra o caixa antes de finalizar a venda.", type: "error" });
      return;
    }

    // Adiciona o pagamento (dispatch síncrono) e depois cede a execução
    // para que o React processe a atualização de estado.
    // O uso do ref (handleFinalizeRef) garante que chamaremos a
    // referência MAIS RECENTE de handleFinalize, com totalPaid já atualizado.
    addPayment(method, total.toFixed(2));

    // Cede o controle da event loop: React 18 processa as atualizações
    // de estado em lote neste ponto, e o ref é sincronizado durante o render.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    await handleFinalizeRef.current();
  };

  // ── Adiciona pagamento no split ──
  const handleAddSplitPayment = () => {
    const amount = parseFloat(splitAmount);
    if (!amount || amount <= 0) {
      addToast({ title: "Valor inválido", type: "error" });
      return;
    }
    const existingIndex = state.payments.findIndex((p) => p.method === quickPaymentMethod);
    if (existingIndex >= 0) {
      addToast({ title: `${METHOD_LABEL[quickPaymentMethod]} já adicionado`, description: "Use a lista para remover e adicionar novamente.", type: "error" });
      return;
    }
    addPayment(quickPaymentMethod, amount.toFixed(2));
    setSplitAmount("");
  };

// ── Finalização usando /sales/checkout ──
  const handleFinalize = useCallback(async () => {
    if (state.items.length === 0) return;
    
    if (hasOpenSession === false && !isAdmin) {
      addToast({ title: "Caixa fechado", description: "Abra o caixa antes de finalizar a venda.", type: "error" });
      return;
    }

    // CORREÇÃO 1: Calcula dinamicamente o valor pago no instante do clique.
    // Se não houver pagamentos na lista (split), é porque é um Pagamento Rápido do valor total.
    const currentTotalPaid = state.payments.length > 0
      ? state.payments.reduce((acc, p) => acc + (parseFloat(p.amount.toString()) || 0), 0)
      : total;

    // CORREÇÃO 2: Proteção contra bug de precisão de decimais do JS (toFixed + Number)
    if (Number(currentTotalPaid.toFixed(2)) < Number(total.toFixed(2))) {
      addToast({ 
        title: "Valor insuficiente", 
        description: `Total pago (R$ ${currentTotalPaid.toFixed(2)}) < Total (R$ ${total.toFixed(2)})`, 
        type: "error" 
      });
      return;
    }

    setFinalizing(true);

    try {
      const mapMethod = (m: string) => {
        const map: Record<string, string> = { cash: "cash", pix: "pix", credit: "credit", debit: "debit", credit_card: "credit", debit_card: "debit" };
        return map[m] || m;
      };
      
      // Pega o método primário do split, ou assume "cash" (dinheiro) para pagamento rápido
      const primaryMethod = state.payments.length > 0 
        ? mapMethod(state.payments[0].method) 
        : "cash"; 

      const payload: any = {
        branch_id: selectedBranchId || "",
        customer_id: state.customer?.id || undefined,
        seller_id: selectedSeller || undefined,
        quote_id: urlQuoteId || undefined,  // Se veio de um orçamento
        payment_method: primaryMethod,
        discount_amount: parseFloat(state.discount) || 0,
        items: state.items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: parseFloat(item.unitPrice),
        })),
      };

      const result = await saleService.pdvCheckout(payload);

      if (result.error) {
        addToast({ title: "Erro ao finalizar venda", description: typeof result.error === "string" ? result.error : "Verifique o estoque", type: "error" });
      } else if (result.data) {
        setSaleDone({
          id: result.data.id,
          total: parseFloat(result.data.totalValue?.toString() || "0"),
          receiptNumber: result.data.receiptNumber || 0,
          items: (result.data.items || []).map((i: any) => ({
            productName: i.productName || i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice || "0",
            subtotal: i.subtotal || "0",
          })),
          // Garante que o recibo seja montado corretamente, quer tenha sido split ou pagamento rápido
          payments: state.payments.length > 0 
            ? state.payments.map((p) => ({ method: p.method, amount: p.amount }))
            : [{ method: primaryMethod, amount: total.toString() }],
          userName: result.data.userName,
          sellerName: result.data.sellerName,
        });
        addToast({ title: "Venda finalizada!", type: "success", description: `R$ ${parseFloat(result.data.totalValue?.toString() || "0").toFixed(2)}` });
      }
    } catch (err: any) {
      addToast({ title: "Erro inesperado", description: err.message || "Tente novamente", type: "error" });
    } finally {
      setFinalizing(false);
    }
  }, [state, userBranchId, total, hasOpenSession, addToast, isAdmin, selectedBranchId, urlQuoteId]); // <== totalPaid removido das dependências para evitar ciclos

  // CORREÇÃO 3: O useRef DEVE ficar exatamente aqui, e não antes da função existir!
  const handleFinalizeRef = useRef(handleFinalize);
  handleFinalizeRef.current = handleFinalize;

  const handleNewSale = () => {
    clearSale();
    setSaleDone(null);
    setShowSplitPanel(false);
    setSplitAmount("");
    quoteLoadedRef.current = false;  // permite novo carregamento de orçamento
    setTimeout(() => productInputRef.current?.focus(), 100);
  };

  const handlePrint = () => window.print();

    // ==========================================================================
  // TELA DE SUCESSO
  // ==========================================================================
  if (saleDone) {
    return (
      <>
        {/* ─── Cupom Térmico (oculto em tela, visível na impressão) ─── */}
        <div className="hidden print:block p-4 max-w-[80mm] mx-auto font-mono text-xs leading-tight">
          <div className="text-center mb-2">
            <p className="text-sm font-bold">{(process.env.NEXT_PUBLIC_COMPANY_NAME || "ELETROSIL").toUpperCase()}</p>
            <p className="text-[10px]">Sistema de Gestão</p>
            <p>- - - - - - - - - - - - - - - -</p>
          </div>
          <div className="mb-2">
            <p>CUPOM NÃO FISCAL</p>
            <p>Nº {String(saleDone.receiptNumber || "").padStart(6, "0")}</p>
            <p>Data: {formatDateTimeBR(new Date().toISOString())}</p>
            <p>Operador: {saleDone.userName || "—"}</p>
            {saleDone.sellerName && <p>Vendedor: {saleDone.sellerName}</p>}
            <p>Cliente: {state.customer?.name || "Consumidor Final"}</p>
            {state.customer?.cpfCnpj && <p>CPF/CNPJ: {state.customer.cpfCnpj}</p>}
          </div>
          <p className="text-center mb-1">- - - - - - - - - - - - - - - -</p>
          <p className="text-center text-[10px] font-bold mb-1">DISCRIMINAÇÃO DOS ITENS</p>
          <p className="text-center mb-1">- - - - - - - - - - - - - - - -</p>
          <table className="w-full">
            <thead>
              <tr className="text-[10px]">
                <th className="text-left">ITEM</th>
                <th className="text-center">QTD</th>
                <th className="text-right">VALOR</th>
              </tr>
            </thead>
            <tbody>
              {saleDone.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="text-left">{item.productName}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">R$ {Number(item.subtotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-center mb-1">- - - - - - - - - - - - - - - -</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            {parseFloat(state.discount) > 0 && (
              <div className="flex justify-between">
                <span>Desconto</span>
                <span>— R$ {parseFloat(state.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm border-t pt-1">
              <span>TOTAL</span>
              <span>R$ {saleDone.total.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-center mb-1 mt-2">- - - - - - - - - - - - - - - -</p>
          <p className="text-center text-[10px] font-bold mb-1">FORMA DE PAGAMENTO</p>
          <div className="space-y-1">
            {saleDone.payments.map((p, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{METHOD_LABEL[p.method] || p.method}</span>
                <span>R$ {Number(p.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
          {change > 0 && (
            <div className="flex justify-between font-bold">
              <span>Troco</span>
              <span>R$ {change.toFixed(2)}</span>
            </div>
          )}
          <p className="text-center mb-1">- - - - - - - - - - - - - - - -</p>
          <div className="text-center text-[10px]">
            <p>Obrigado pela preferência!</p>
            <p className="mt-1">{process.env.NEXT_PUBLIC_COMPANY_NAME || "Eletrosil"} — Sistema de Gestão</p>
          </div>
        </div>

        {/* ─── Tela de Sucesso (visível em tela) ─── */}
        <div className="print:hidden h-[calc(100vh-80px)] flex items-center justify-center">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="flex justify-center mb-2">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl">Venda Concluída!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-1">
                <p className="text-sm text-muted-foreground">
                  Cupom #{String(saleDone.receiptNumber || "").padStart(6, "0")}
                </p>
                <p className="text-3xl font-bold">R$ {saleDone.total.toFixed(2)}</p>
              </div>
              {change > 0 && (
                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                  <p className="text-sm text-green-700">Troco</p>
                  <p className="text-xl font-bold text-green-700">R$ {change.toFixed(2)}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" /> Imprimir
                </Button>
                <Button className="flex-1" onClick={handleNewSale}>
                  Nova Venda
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">F9: Nova Venda &middot; ESC: Fechar</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // ── Nome da unidade para o badge do PDV (estritamente reativo) ──
  const isLoadingBranches = branches.length === 0;
  const selectedBranch = branches.find((b) => b.id === selectedBranchId);
  const badgeText = isLoadingBranches
    ? "Carregando..."
    : selectedBranch
      ? selectedBranch.name
      : "Unidade Desconhecida";

  // ==========================================================================
  // GUARD: Se não há branchId, solicita seleção de unidade
  // ==========================================================================
  if (!urlBranchId && !userBranchId && !isAdmin) {
    return (
      <div className="h-[calc(100vh-76px)] flex items-center justify-center">
        <EmptyState
          message="Selecione uma unidade para acessar o PDV."
          label="Ir para Unidades"
          href="/dashboard"
        />
      </div>
    );
  }

  // Se admin não selecionou unidade ainda (branches nao carregadas)
  if (isAdmin && !selectedBranchId) {
    return (
      <div className="h-[calc(100vh-76px)] flex items-center justify-center">
        <EmptyState
          message="Carregando unidades disponíveis..."
          label="Ir para Dashboard"
          href="/dashboard"
        />
      </div>
    );
  }

  // ==========================================================================
  // PDV PRINCIPAL — Layout Otimizado para Velocidade
  // ==========================================================================
  const remaining = Math.max(0, total - totalPaid);

  return (
    <div className="h-[calc(100vh-76px)] flex flex-col">
      {/* ─── Banner de orçamento carregado ─── */}
      {loadingQuote && (
        <div className="flex items-center gap-2 mb-2 px-4 py-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg text-sm text-purple-700 dark:text-purple-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando orçamento...
        </div>
      )}
      {quoteLoaded && !loadingQuote && (
        <div className="flex items-center justify-between gap-2 mb-2 px-4 py-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg text-sm">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <FileText className="h-4 w-4" />
            <span>Orçamento carregado — revise os itens, escolha a forma de pagamento e finalize a venda</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50"
            onClick={() => {
              clearSale();
              setQuoteLoaded(false);
              quoteLoadedRef.current = false;  // permite carregar denovo se usuário navegar
              // Remove o quote_id da URL sem recarregar a página
              const newUrl = window.location.pathname + (urlBranchId ? `?branch=${urlBranchId}` : '');
              window.history.replaceState({}, '', newUrl);
            }}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Descartar
          </Button>
        </div>
      )}

      {/* ─── Top Bar ─── */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        {/* Badge da Unidade */}
        {selectedBranchId && (
          <Badge variant="secondary" className="h-9 px-3 text-sm font-semibold whitespace-nowrap shrink-0 hidden md:inline-flex items-center gap-1.5">
            <Building2 className="h-4 w-4" />
            {badgeText}
          </Badge>
        )}
        {/* Input de Busca Gigante — sempre focado */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            ref={productInputRef}
            type="text"
            placeholder="Buscar produto por nome ou código... (setas ↑↓ para navegar, Enter para selecionar)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-14 pl-12 pr-4 text-lg rounded-xl border-2 border-primary/30 bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
            <Keyboard className="h-3 w-3" />
            <span className="hidden sm:inline">F9=Finalizar ESC=Limpar</span>
          </div>

          {showResults && (
            <Card className="absolute z-20 w-full mt-1 max-h-72 overflow-auto shadow-xl border-2">
              <CardContent className="p-1">
                {isSearchingProducts ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" /> Buscando...
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-center py-6 text-muted-foreground">
                    Nenhum produto encontrado para &quot;{searchTerm}&quot;
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    {searchResults.map((p, idx) => (
                      <div
                        key={p.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                          idx === selectedProductIndex
                            ? "bg-primary/10 ring-1 ring-primary/30"
                            : "hover:bg-accent",
                        )}
                        onClick={() => handleSelectProduct(p)}
                        onMouseEnter={() => setSelectedProductIndex(idx)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Estoque: {p.quantity || 0} {p.unitType}
                          </p>
                        </div>
                        <p className="font-bold text-lg ml-3 whitespace-nowrap">
                          R$ {(p.unitPrice / 100).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Seletor de Unidade (admin only) */}
        {isAdmin && branches.length > 0 && (
          <Select
            value={selectedBranchId || ""}
            onValueChange={(val) => setSelectedBranchId(val)}
          >
            <SelectTrigger className="w-44 h-14 text-base">
              <Building2 className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Unidade" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ─── Corpo: Grid 7/5 ─── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">

        {/* ════════════ COLUNA ESQUERDA (7/12) — CARRINHO ════════════ */}
        <div className="lg:col-span-7 flex flex-col overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="py-3 px-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Carrinho</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{state.items.length} item(ns)</span>
                  <span className="font-semibold text-foreground">R$ {subtotal.toFixed(2)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              {state.items.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground p-8">
                  <div className="text-center space-y-2">
                    <Search className="h-10 w-10 mx-auto opacity-30" />
                    <p>Busque produtos acima para adicionar ao carrinho</p>
                    <p className="text-xs">Use setas ↑↓ e Enter para seleção rápida</p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-[40%]">Produto</TableHead>
                      <TableHead className="text-center w-[20%]">Qtd</TableHead>
                      <TableHead className="text-right w-[18%]">Preço</TableHead>
                      <TableHead className="text-right w-[18%]">Subtotal</TableHead>
                      <TableHead className="text-center w-[4%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.items.map((item) => (
                      <TableRow key={item.productId} className="group">
                        <TableCell className="font-medium text-sm truncate max-w-[200px]">
                          {item.name || item.productId}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                              className="w-14 text-center h-7 rounded-md border bg-background text-sm"
                              min="0"
                            />
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">R$ {parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold text-sm">R$ {parseFloat(item.subtotal).toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive" onClick={() => removeItem(item.productId)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ════════════ COLUNA DIREITA (5/12) — RESUMO + PAGAMENTO ════════════ */}
        <div className="lg:col-span-5 flex flex-col gap-3 overflow-y-auto pb-2">

          {/* ─── BLOCO: VENDEDOR ─── */}
          <Card className="flex-shrink-0">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <BadgePercent className="h-4 w-4 text-muted-foreground shrink-0" />
                <Popover open={showSellerPopover} onOpenChange={setShowSellerPopover}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-sm h-9">
                      <BadgePercent className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {selectedSeller
                          ? sellers.find(s => s.id === selectedSeller)?.name || "Vendedor"
                          : loadingSellers ? "Carregando..." : "Vendedor (opcional)"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0 z-[100]" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar vendedor..." />
                      <CommandList>
                        {sellers.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            Nenhum vendedor cadastrado
                          </div>
                        ) : (
                          <CommandGroup>
                            {sellers.map((seller) => (
                              <CommandItem key={seller.id} onSelect={() => { setSelectedSeller(seller.id); setShowSellerPopover(false); }} className="cursor-pointer">
                                {seller.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedSeller && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-destructive"
                    onClick={() => setSelectedSeller(null)}
                    title="Remover vendedor"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ─── BLOCO: CLIENTE ─── */}
          <Card className="flex-shrink-0">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Popover open={showCustomerPopover} onOpenChange={setShowCustomerPopover}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 justify-start text-sm h-9">
                      <User className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">{state.customer ? state.customer.name : "Consumidor Final"}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput placeholder="Buscar cliente..." value={customerSearch} onValueChange={setCustomerSearch} />
                      <CommandList>
                        {isSearchingCustomers ? (
                          <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                          </div>
                        ) : customerResults.length === 0 && customerSearch.length >= 3 ? (
                          <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {customerResults.map((c) => (
                              <CommandItem key={c.id} onSelect={() => handleSelectCustomer(c)} className="cursor-pointer">
                                <div className="flex flex-col">
                                  <span className="font-medium">{c.name}</span>
                                  <span className="text-xs text-muted-foreground">{c.cpfCnpj}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowCustomerDialog(true)} title="Novo Cliente">
                  <UserPlus className="h-4 w-4" />
                </Button>
                {state.customer && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive" onClick={() => setCustomer(null)} title="Remover cliente">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ─── BLOCO: RESUMO FINANCEIRO ─── */}
          <Card className="flex-shrink-0">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Desconto</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs">R$</span>
                  <Input
                    type="number"
                    value={state.discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-20 h-7 text-right text-sm"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total</span>
                <span className={parseFloat(state.discount) > 0 ? "text-green-600" : ""}>
                  R$ {total.toFixed(2)}
                </span>
              </div>

              {/* Barra de progresso do pagamento */}
              {state.payments.length > 0 && (
                <div className="pt-1">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Pago: R$ {totalPaid.toFixed(2)}</span>
                    {remaining > 0 ? (
                      <span className="text-amber-600 font-medium">Falta: R$ {remaining.toFixed(2)}</span>
                    ) : (
                      <span className="text-green-600 font-medium">Total pago</span>
                    )}
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        totalPaid >= total ? "bg-green-500" : "bg-amber-400",
                      )}
                      style={{ width: `${Math.min(100, (totalPaid / (total || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Troco */}
              {hasCashPayment && totalPaid > total && (
                <div className="flex justify-between text-green-600 font-bold animate-in fade-in slide-in-from-top-1 bg-green-50 dark:bg-green-950/30 p-2 rounded-lg">
                  <span>Troco:</span>
                  <span>R$ {change.toFixed(2)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── BLOCO: LISTA DE PAGAMENTOS ADICIONADOS (split) ─── */}
          {state.payments.length > 0 && (
            <Card className="flex-shrink-0">
              <CardContent className="p-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pagamentos</p>
                {state.payments.map((p, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{METHOD_LABEL[p.method] || p.method}</span>
                      <span className="text-sm font-bold">R$ {parseFloat(p.amount).toFixed(2)}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removePayment(index)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ─── BLOCO: AÇÕES DE PROPOSTA ─── */}
          {!urlQuoteId && (
            <Card className="flex-shrink-0 border-purple-200 dark:border-purple-900">
              <CardContent className="p-3">
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Ações de Proposta
                </p>
                <Button
                  variant="outline"
                  className="w-full h-11 text-sm font-medium border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:text-purple-800 dark:hover:text-purple-200 hover:border-purple-400 dark:hover:border-purple-600 rounded-xl transition-all"
                  disabled={state.items.length === 0 || savingQuote}
                  onClick={handleSaveQuote}
                >
                  {savingQuote ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</>
                  ) : (
                    <><FileText className="h-4 w-4 mr-2" /> Gerar Orçamento / Proposta</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ─── BLOCO: BOTÕES DE FORMA DE PAGAMENTO ─── */}
          <Card className="flex-shrink-0">
            <CardContent className="p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Forma de Pagamento
              </p>

              {/* Botões grandes de método de pagamento */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const isSelected = quickPaymentMethod === method.key;
                  return (
                    <button
                      key={method.key}
                      onClick={() => setQuickPaymentMethod(method.key)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-3 rounded-xl text-white font-medium text-sm transition-all",
                        method.color,
                        isSelected && "ring-2 ring-offset-2 ring-offset-background scale-[1.02]",
                        !isSelected && "opacity-80 hover:opacity-100",
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {method.label}
                    </button>
                  );
                })}
              </div>

              {/* Ações: Split, Pagamento Único ou Finalizar */}
              <div className="flex gap-2">
                {/* ── CONDIÇÃO 1: Pagamentos existem e total foi atingido → Finalizar ── */}
                {state.payments.length > 0 && totalPaid >= total ? (
                  <Button
                    size="lg"
                    className="flex-1 text-base h-11 font-bold bg-green-600 hover:bg-green-700 text-white"
                    disabled={finalizing}
                    onClick={handleFinalize}
                  >
                    {finalizing ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Finalizando...</>
                    ) : (
                      <>Finalizar Venda (F9)</>
                    )}
                  </Button>
                ) : /* ── CONDIÇÃO 2: Modo split ativo OU pagamento parcial existente → Inputs de Split ── */
                (showSplitPanel || state.payments.length > 0) ? (
                  <>
                    <div className="flex-1 flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        placeholder="Valor"
                        value={splitAmount}
                        onChange={(e) => setSplitAmount(e.target.value)}
                        className="h-9 text-sm"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <Button size="sm" variant="secondary" onClick={handleAddSplitPayment}
                      disabled={!splitAmount || parseFloat(splitAmount) <= 0}>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowSplitPanel(false); setSplitAmount(""); }}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  /* ── CONDIÇÃO 3: Nenhum pagamento → Botão de Pagamento Único ── */
                  <>
                    <Button
                      size="lg"
                      className={cn(
                        "flex-1 text-base h-11 font-bold",
                        state.items.length === 0
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700 text-white",
                      )}
                      disabled={state.items.length === 0 || finalizing}
                      onClick={() => handleQuickPayAndFinalize(quickPaymentMethod)}
                    >
                      {finalizing ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Finalizando...</>
                      ) : (
                        <>
                          Pagar com {PAYMENT_METHODS.find(m => m.key === quickPaymentMethod)?.label}
                          <span className="ml-2 text-lg">R$ {total.toFixed(2)}</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11"
                      onClick={() => setShowSplitPanel(true)}
                      title="Pagamento dividido"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              {/* Avisos */}
              {state.items.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">Adicione produtos ao carrinho</p>
              )}
              {hasOpenSession === false && !isAdmin && (
                <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Caixa fechado
                </p>
              )}
              {state.payments.length > 0 && remaining > 0 && (
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  Faltam R$ {remaining.toFixed(2)} — use o split para adicionar mais formas
                </p>
              )}
            </CardContent>
          </Card>

          {/* Atalhos de teclado */}
          <div className="flex-shrink-0 text-xs text-muted-foreground text-center pt-1">
            <span className="inline-flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">F9</kbd> Finalizar
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">ESC</kbd> Limpar
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd> Navegar
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> Selecionar
            </span>
          </div>
        </div>
      </div>

      {/* Dialog de criação rápida de cliente */}
      <CustomerQuickCreateDialog
        open={showCustomerDialog}
        onOpenChange={setShowCustomerDialog}
        onCustomerCreated={handleCustomerCreated}
      />
    </div>
  );
}
