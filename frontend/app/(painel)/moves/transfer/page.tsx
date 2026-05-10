"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Store,
  Package,
  Trash2,
  Plus,
  Loader2,
  AlertCircle,
  Search,
  Ban,
  ClipboardList,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageTitle } from "@/components/page-title";
import { BackButton } from "@/components/back-button";
import { getClientApi } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// ─── Tipos ───────────────────────────────────────────────────────────────

interface BranchOption {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  unitType: string;
  quantity: number;
}

interface TransferItemEntry {
  product_id: string;
  product_name: string;
  quantity: number;
  available: number;
  unitType: string;
}

// ─── Componente Principal ────────────────────────────────────────────────

export default function TransferPage() {
  const router = useRouter();
  const { addToast } = useToast();

  // ─── Filiais ─────────────────────────────────────────────────────────
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);

  const [sourceBranchId, setSourceBranchId] = useState<string>("");
  const [destBranchId, setDestBranchId] = useState<string>("");

  // ─── Produtos (autocomplete filtrado pelo estoque da origem) ───────
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ProductOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // ─── Itens adicionados à lista de transferência ─────────────────────
  const [items, setItems] = useState<TransferItemEntry[]>([]);

  // ─── Quantidade do produto sendo adicionado ─────────────────────────
  const [qtyInput, setQtyInput] = useState<string>("");

  // ─── Estado de envio ────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Carregar Filiais ───────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const api = getClientApi();
        const res = await api.get("/branches");
        const list = (res.data?.data || []).map((b: any) => ({
          id: b.id,
          name: b.name,
        }));
        setBranches(list);
      } catch (err) {
        console.error("[TransferPage] Erro ao carregar filiais:", err);
      } finally {
        setIsLoadingBranches(false);
      }
    };
    load();
  }, []);

  // ─── Buscar produtos (estoque da origem) ────────────────────────────
  const searchProducts = useCallback(
    async (term: string) => {
      if (term.length < 2 || !sourceBranchId) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const api = getClientApi();
        const res = await api.get("/products", {
          params: { name: term, branchId: sourceBranchId, limit: 15 },
        });

        const products: ProductOption[] = (res.data?.data || [])
          .filter((p: any) => {
            // Remove produtos já adicionados à lista
            const jaAdicionado = items.some(
              (i) => i.product_id === p.id,
            );
            // Remove produtos sem estoque
            const temEstoque = Number(p.quantity) > 0;
            return !jaAdicionado && temEstoque;
          })
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            unitType: p.unitType,
            quantity: Number(p.quantity),
          }));

        setSearchResults(products);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [sourceBranchId, items],
  );

  // Debounce da busca
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchProducts(searchTerm);
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, searchProducts]);

  // ─── Limpar seleção ao mudar a origem ──────────────────────────────
  const handleSourceChange = (val: string) => {
    setSourceBranchId(val);
    setSearchTerm("");
    setSearchResults([]);
    setQtyInput("");
    // Se o destino for igual à nova origem, limpa o destino
    if (destBranchId === val) {
      setDestBranchId("");
    }
  };

  // ─── Adicionar item à lista ─────────────────────────────────────────
  const handleAddItem = (product: ProductOption) => {
    const qty = Number(qtyInput);
    if (!qty || qty <= 0) {
      addToast({
        title: "Quantidade inválida",
        description: "Informe uma quantidade maior que zero.",
        type: "error",
      });
      return;
    }

    if (qty > product.quantity) {
      addToast({
        title: "Saldo insuficiente",
        description: `Estoque disponível: ${product.quantity} ${product.unitType}`,
        type: "error",
      });
      return;
    }

    // Verifica se já não foi adicionado
    if (items.some((i) => i.product_id === product.id)) {
      addToast({
        title: "Produto duplicado",
        description: "Este produto já está na lista.",
        type: "error",
      });
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        available: product.quantity,
        unitType: product.unitType,
      },
    ]);

    // Limpa os campos de input
    setSearchTerm("");
    setSearchResults([]);
    setQtyInput("");
  };

  // ─── Remover item da lista ─────────────────────────────────────────
  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  };

  // ─── Efetivar Transferência ──────────────────────────────────────────
  const handleSubmit = async () => {
    if (!sourceBranchId || !destBranchId) {
      addToast({
        title: "Selecione as filiais",
        description: "É necessário selecionar origem e destino.",
        type: "error",
      });
      return;
    }

    if (sourceBranchId === destBranchId) {
      addToast({
        title: "Filiais iguais",
        description: "A origem e o destino devem ser diferentes.",
        type: "error",
      });
      return;
    }

    if (items.length === 0) {
      addToast({
        title: "Nenhum item",
        description: "Adicione pelo menos um produto para transferir.",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const api = getClientApi();

      const payload = {
        source_branch_id: sourceBranchId,
        destination_branch_id: destBranchId,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
        })),
      };

      const response = await api.post("/moves/transfer", payload);

      const data = response.data?.data;

      addToast({
        title: "Transferência concluída!",
        description:
          data?.mensagem ||
          `${items.length} produto(s) transferido(s) com sucesso.`,
        type: "success",
      });

      // Redireciona para a listagem
      router.push("/moves");
    } catch (err: any) {
      const errDetail = err?.response?.data?.detail;
      let msg = "Erro ao realizar transferência.";

      if (typeof errDetail === "string") {
        msg = errDetail;
      } else if (errDetail?.message) {
        msg = errDetail.message;
        if (errDetail.errors?.length > 0) {
          // Mostra o primeiro erro detalhado
          const firstError = errDetail.errors[0];
          msg = firstError.error || msg;
        }
      }

      addToast({
        title: "Erro na transferência",
        description: msg,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="Transferência Multi-Filial"
        leftSide={<BackButton fallbackUrl="/moves" />}
      />

      {/* ── Seletor de Filiais ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="h-5 w-5 text-primary" />
            Filiais
          </CardTitle>
          <CardDescription>
            Selecione a filial de origem (de onde sairão os produtos) e a
            filial de destino (para onde irão).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ── Origem ── */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <span className="inline-flex items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 w-5 h-5 text-xs font-bold">
                  O
                </span>
                Filial de Origem
              </Label>
              <Select
                value={sourceBranchId}
                onValueChange={handleSourceChange}
                disabled={isLoadingBranches || isSubmitting}
              >
                <SelectTrigger
                  className={cn(
                    "w-full",
                    sourceBranchId && "border-red-300 dark:border-red-800",
                  )}
                >
                  <SelectValue
                    placeholder={
                      isLoadingBranches
                        ? "Carregando..."
                        : "Selecione a origem"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem
                      key={b.id}
                      value={b.id}
                      disabled={b.id === destBranchId}
                    >
                      {b.name}
                      {b.id === destBranchId ? " (destino)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sourceBranchId && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Store className="h-3 w-3" />
                  {branches.find((b) => b.id === sourceBranchId)?.name}
                </p>
              )}
            </div>

            {/* ── Destino ── */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <span className="inline-flex items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 w-5 h-5 text-xs font-bold">
                  D
                </span>
                Filial de Destino
              </Label>
              <Select
                value={destBranchId}
                onValueChange={setDestBranchId}
                disabled={isLoadingBranches || isSubmitting || !sourceBranchId}
              >
                <SelectTrigger
                  className={cn(
                    "w-full",
                    destBranchId &&
                      "border-green-300 dark:border-green-800",
                  )}
                >
                  <SelectValue
                    placeholder={
                      !sourceBranchId
                        ? "Selecione a origem primeiro"
                        : isLoadingBranches
                          ? "Carregando..."
                          : "Selecione o destino"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {branches
                    .filter((b) => b.id !== sourceBranchId)
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {destBranchId && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Store className="h-3 w-3" />
                  {branches.find((b) => b.id === destBranchId)?.name}
                </p>
              )}
            </div>
          </div>

          {/* Indicador visual de transferência */}
          {sourceBranchId && destBranchId && sourceBranchId !== destBranchId && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 border border-dashed">
              <span className="font-medium text-red-600 dark:text-red-400">
                {branches.find((b) => b.id === sourceBranchId)?.name}
              </span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="font-medium text-green-600 dark:text-green-400">
                {branches.find((b) => b.id === destBranchId)?.name}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Adicionar Produtos ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5 text-primary" />
            Adicionar Produtos
          </CardTitle>
          <CardDescription>
            Busque produtos disponíveis no estoque da origem e defina a
            quantidade a transferir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-3 items-end">
            {/* Autocomplete de Produtos */}
            <div className="space-y-1.5 relative">
              <Label htmlFor="product-search">Produto</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="product-search"
                  placeholder={
                    sourceBranchId
                      ? "Digite o nome do produto..."
                      : "Selecione a origem primeiro"
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={!sourceBranchId || isSubmitting}
                  className="pl-8 h-9 text-sm"
                />
                {isSearching && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Dropdown de resultados */}
              {searchResults.length > 0 && (
                <div className="absolute z-20 w-full bg-background border rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className="w-full px-3 py-2.5 hover:bg-muted cursor-pointer border-b last:border-0 text-sm flex items-center justify-between gap-2 text-left"
                      onClick={() => {
                        setSearchTerm(product.name);
                        setSearchResults([]);
                        setQtyInput(String(product.quantity > 0 ? 1 : ""));
                        // Foco no input de quantidade
                        setTimeout(() => {
                          const qtyEl = document.getElementById(
                            "qty-input",
                          );
                          qtyEl?.focus();
                        }, 100);
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">
                          {product.name}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        <strong>{product.quantity}</strong> {product.unitType}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Produto selecionado com atalho para adicionar */}
              {searchTerm &&
                searchResults.length === 0 &&
                !isSearching &&
                searchTerm.length >= 2 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum produto encontrado com este nome.
                  </p>
                )}
            </div>

            {/* Quantidade */}
            <div className="space-y-1.5">
              <Label htmlFor="qty-input">Quantidade</Label>
              <Input
                id="qty-input"
                type="number"
                step="1"
                min="1"
                placeholder="0"
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                disabled={!sourceBranchId || isSubmitting}
                className="h-9 text-sm text-center"
              />
            </div>

            {/* Botão Adicionar */}
            <Button
              type="button"
              onClick={() => {
                // Procura o produto pelo nome exato digitado
                if (!searchTerm || !qtyInput) return;

                // Tenta encontrar nos resultados ou no termo exato
                const product = searchResults.find(
                  (p) =>
                    p.name.toLowerCase() === searchTerm.toLowerCase(),
                );

                if (product) {
                  handleAddItem({
                    ...product,
                    quantity: Number(qtyInput),
                  });
                } else {
                  addToast({
                    title: "Produto não encontrado",
                    description:
                      "Selecione um produto da lista de resultados.",
                    type: "error",
                  });
                }
              }}
              disabled={
                !searchTerm ||
                !qtyInput ||
                Number(qtyInput) <= 0 ||
                isSubmitting
              }
              className="h-9 gap-1"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Lista de Itens para Transferir ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-5 w-5 text-primary" />
              Itens para Transferir
            </CardTitle>
            {items.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {items.length} {items.length === 1 ? "item" : "itens"}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Ban className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">
                Nenhum produto adicionado
              </p>
              <p className="text-xs mt-1">
                Busque produtos acima para adicioná-los à transferência.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-[100px] text-center">
                      Disponível
                    </TableHead>
                    <TableHead className="w-[100px] text-center">
                      Transferir
                    </TableHead>
                    <TableHead className="w-[60px] text-center">
                      Un.
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.product_id}>
                      <TableCell className="font-medium">
                        {item.product_name}
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {item.available}
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold text-sm">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {item.unitType}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveItem(item.product_id)
                          }
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          disabled={isSubmitting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Sumário */}
              <div className="flex items-center justify-end gap-4 px-4 py-3 bg-muted/20 border-t text-sm">
                <span className="text-muted-foreground">
                  Total de itens:
                </span>
                <span className="font-semibold">{items.length}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Ações Finais ── */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" asChild>
          <Link href="/moves">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            !sourceBranchId ||
            !destBranchId ||
            sourceBranchId === destBranchId ||
            items.length === 0
          }
          size="lg"
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Transferindo...
            </>
          ) : (
            <>
              <ArrowRight className="h-4 w-4" />
              Efetivar Transferência
            </>
          )}
        </Button>
      </div>

      {/* Bloqueio visual se origem = destino */}
      {sourceBranchId && destBranchId && sourceBranchId === destBranchId && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>
            A filial de origem e destino devem ser diferentes. Selecione
            filiais distintas.
          </p>
        </div>
      )}
    </div>
  );
}
