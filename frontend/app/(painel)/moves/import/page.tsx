"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Upload,
  FileText,
  Building2,
  Hash,
  Calendar,
  DollarSign,
  Package,
  Ruler,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileSpreadsheet,
  BadgePercent,
  Link2,
  Search,
  Save,
  Store,
  ClipboardList,
  PlusCircle,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { BackButton } from "@/components/back-button";
import { getClientApi } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// ─── Tipos ───────────────────────────────────────────────────────────────

interface ItemNFe {
  numeroItem: number;
  codigoFornecedor: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  unidadeOriginal: string;
  unidadeMapeada: string;
  valorTotal: number;
  ean: string;
  localProductId: string | null;
  localProductName: string | null;
}

interface CabecalhoNFe {
  fornecedor: string;
  cnpj: string;
  dataEmissao: string;
  numeroNota: string;
  serie: string;
  chaveAcesso: string;
  naturezaOperacao: string;
}

interface DadosNFe {
  cabecalho: CabecalhoNFe;
  itens: ItemNFe[];
  totalItens: number;
  valorTotalNota: number;
  valorTotalProdutos: number;
}

interface ProdutoLocal {
  id: string;
  name: string;
  unitType: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatCNPJ(cnpj: string): string {
  if (!cnpj || cnpj.length !== 14) return cnpj;
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────

type Etapa = "upload" | "conferencia" | "vinculo";

export default function ImportNFePage() {
  const router = useRouter();
  const { addToast } = useToast();

  // Estados gerais
  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [dadosNFe, setDadosNFe] = useState<DadosNFe | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estado do Vinculo
  const [vinculos, setVinculos] = useState<Record<number, ProdutoLocal | null>>(
    {},
  );
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
  const [searchResults, setSearchResults] = useState<
    Record<number, ProdutoLocal[]>
  >({});
  const [searchingItem, setSearchingItem] = useState<number | null>(null);

  // Estado da Filial e processamento da entrada
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchId, setBranchId] = useState<string>("");
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [isProcessingEntry, setIsProcessingEntry] = useState(false);

  // Estado do Modal de Criação Rápida
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateItem, setQuickCreateItem] = useState<ItemNFe | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Upload do XML ─────────────────────────────────────────────────────

  const uploadXML = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".xml")) {
        setErrorMessage("O arquivo precisa ter extensão .xml");
        return;
      }

      setIsUploading(true);
      setErrorMessage(null);

      try {
        const api = getClientApi();
        const formData = new FormData();
        formData.append("file", file);

        const response = await api.post("/moves/import-xml", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const { data } = response.data;

        if (data && data.cabecalho && data.itens) {
          setDadosNFe(data as DadosNFe);
          setEtapa("conferencia");
          addToast({
            title: "XML processado com sucesso!",
            description: `${data.cabecalho.fornecedor} - ${data.totalItens} itens encontrados.`,
            type: "success",
          });
        } else {
          throw new Error("Resposta inesperada do servidor");
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ||
          err?.message ||
          "Erro ao processar o XML";
        setErrorMessage(msg);
        addToast({
          title: "Erro ao processar XML",
          description: msg,
          type: "error",
        });
      } finally {
        setIsUploading(false);
        // Limpa o input para permitir re-upload do mesmo arquivo
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [addToast],
  );

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadXML(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadXML(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleReset = () => {
    setDadosNFe(null);
    setErrorMessage(null);
    setEtapa("upload");
    setVinculos({});
    setSearchTerms({});
    setSearchResults({});
  };

  // ─── Carregar Filiais ─────────────────────────────────────────────────

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const api = getClientApi();
        const res = await api.get("/branches");
        const list = res.data?.data || [];
        setBranches(list);
      } catch (err) {
        console.error("[ImportNFe] Erro ao carregar filiais:", err);
      } finally {
        setIsLoadingBranches(false);
      }
    };
    loadBranches();
  }, []);

  // ─── Carregar Categorias ──────────────────────────────────────────────

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const api = getClientApi();
        const res = await api.get("/categories?limit=100");
        const list = res.data?.data || [];
        setCategories(list);
      } catch (err) {
        console.error("[ImportNFe] Erro ao carregar categorias:", err);
      }
    };
    loadCategories();
  }, []);

  // ─── Busca de Produtos (Autocomplete) ─────────────────────────────────

  const searchLocalProducts = useCallback(
    async (term: string, itemNumero: number) => {
      if (term.length < 2) {
        setSearchResults((prev) => ({ ...prev, [itemNumero]: [] }));
        return;
      }

      setSearchingItem(itemNumero);

      try {
        const api = getClientApi();
        const response = await api.get("/products", {
          params: { name: term, limit: 10 },
        });

        const products: ProdutoLocal[] = (response.data?.data || []).map(
          (p: any) => ({
            id: p.id,
            name: p.name,
            unitType: p.unitType,
          }),
        );

        setSearchResults((prev) => ({ ...prev, [itemNumero]: products }));
      } catch {
        setSearchResults((prev) => ({ ...prev, [itemNumero]: [] }));
      } finally {
        setSearchingItem(null);
      }
    },
    [],
  );

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      for (const [numero, term] of Object.entries(searchTerms)) {
        if (term) {
          searchLocalProducts(term, Number(numero));
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerms, searchLocalProducts]);

  // ─── Handlers de Vinculo ──────────────────────────────────────────────

  const handleAvancarVinculo = () => {
    if (!dadosNFe) return;
    setEtapa("vinculo");

    const vinculosIniciais: Record<number, ProdutoLocal | null> = {};
    const searchIniciais: Record<number, string> = {};

    for (const item of dadosNFe.itens) {
      if (item.localProductId && item.localProductName) {
        vinculosIniciais[item.numeroItem] = {
          id: item.localProductId,
          name: item.localProductName,
          unitType: "",
        };
        searchIniciais[item.numeroItem] = item.localProductName;
      } else {
        vinculosIniciais[item.numeroItem] = null;
        searchIniciais[item.numeroItem] = "";
      }
    }

    setVinculos(vinculosIniciais);
    setSearchTerms(searchIniciais);
  };

  const handleSelectProduct = (itemNumero: number, product: ProdutoLocal) => {
    setVinculos((prev) => ({ ...prev, [itemNumero]: product }));
    setSearchTerms((prev) => ({ ...prev, [itemNumero]: product.name }));
    setSearchResults((prev) => ({ ...prev, [itemNumero]: [] }));
  };

  const handleClearProduct = (itemNumero: number) => {
    setVinculos((prev) => ({ ...prev, [itemNumero]: null }));
    setSearchTerms((prev) => ({ ...prev, [itemNumero]: "" }));
    setSearchResults((prev) => ({ ...prev, [itemNumero]: [] }));
  };

  // ─── Cadastro Rápido de Produto ───────────────────────────────────────

  const openQuickCreate = (item: ItemNFe) => {
    setQuickCreateItem(item);
    setSelectedCategoryId("");
    setQuickCreateOpen(true);
  };

  const handleCreateAndLinkProduct = async () => {
    if (!quickCreateItem || !selectedCategoryId) {
      addToast({
        title: "Dados incompletos",
        description: "Selecione uma categoria para o novo produto.",
        type: "error",
      });
      return;
    }

    setIsCreatingProduct(true);

    try {
      const api = getClientApi();

      // Converte o valor unitário de reais (ex: 159.90) para centavos (15990)
      const precoCentavos = Math.round(quickCreateItem.valorUnitario * 100);

      // Mapeia a unidade do XML para o enum do sistema
      const unitTypeMap: Record<string, string> = {
        UN: "un",
        CX: "cx",
        RL: "rl",
        M: "m",
        PC: "pc",
        KG: "kg",
        LT: "lt",
        PAR: "par",
        CJ: "cj",
        G: "g",
        ML: "ml",
        L: "l",
      };
      const unitType =
        unitTypeMap[quickCreateItem.unidadeMapeada.toUpperCase()] || "un";

      const payload = {
        name: quickCreateItem.descricao,
        categoryId: selectedCategoryId,
        unitPrice: precoCentavos,
        unitType: unitType,
        quantity: 0,
      };

      const response = await api.post("/products", payload);
      const novoProduto = response.data?.data;

      if (!novoProduto || !novoProduto.id) {
        throw new Error("Resposta invalida do servidor");
      }

      // Vincula automaticamente o novo produto ao item da nota
      const novoVinculo: ProdutoLocal = {
        id: novoProduto.id,
        name: novoProduto.name,
        unitType: novoProduto.unitType,
      };

      handleSelectProduct(quickCreateItem.numeroItem, novoVinculo);

      addToast({
        title: "Produto cadastrado!",
        description: `"${novoProduto.name}" criado e vinculado ao item #${quickCreateItem.numeroItem}.`,
        type: "success",
      });

      // Fecha o modal e limpa
      setQuickCreateOpen(false);
      setQuickCreateItem(null);
      setSelectedCategoryId("");
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Erro ao criar produto";

      if (err?.response?.status === 409) {
        addToast({
          title: "Produto ja existe",
          description:
            "Ja existe um produto com este nome. Busque-o na lista acima.",
          type: "error",
        });
      } else {
        addToast({
          title: "Erro ao criar produto",
          description: msg,
          type: "error",
        });
      }
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleConcluir = async () => {
    if (!dadosNFe) return;

    // Valida se todos os itens foram vinculados
    const itensSemVinculo = dadosNFe.itens.filter(
      (item) => !vinculos[item.numeroItem],
    );
    if (itensSemVinculo.length > 0) {
      addToast({
        title: "Vinculo incompleto",
        description: `${itensSemVinculo.length} item(ns) ainda nao foram associados a um produto local.`,
        type: "error",
      });
      return;
    }

    // Valida se a filial foi selecionada
    if (!branchId) {
      addToast({
        title: "Filial nao selecionada",
        description: "Selecione a filial para dar entrada no estoque.",
        type: "error",
      });
      return;
    }

    setIsSaving(true);

    try {
      const api = getClientApi();

      // ── 1) Salva os mapeamentos De/Para ──
      const mapPayload = {
        mappings: dadosNFe.itens.map((item) => ({
          supplierCnpj: dadosNFe.cabecalho.cnpj,
          supplierProductCode: item.codigoFornecedor,
          localProductId: vinculos[item.numeroItem]!.id,
        })),
      };

      await api.post("/moves/import/map-products", mapPayload);

      addToast({
        title: "Associacao concluida!",
        description: `${mapPayload.mappings.length} produto(s) mapeado(s) com sucesso. O sistema aprendeu os vinculos para notas futuras.`,
        type: "success",
      });

      // ── 2) Processa a entrada física no estoque ──
      setIsProcessingEntry(true);

      const entryPayload = {
        branch_id: branchId,
        items: dadosNFe.itens.map((item) => ({
          local_product_id: vinculos[item.numeroItem]!.id,
          quantidade: item.quantidade,
        })),
      };

      const entryRes = await api.post(
        "/moves/import/process-entry",
        entryPayload,
      );

      const entryData = entryRes.data?.data;

      addToast({
        title: "Entrada no estoque concluida!",
        description:
          entryData?.mensagem ||
          `${entryPayload.items.length} produto(s) deram entrada no estoque com sucesso.`,
        type: "success",
      });

      console.log("[ImportNFe] Entrada processada:", entryData);

      // ── 3) Redireciona para a listagem ──
      router.push("/moves");
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Erro ao processar entrada no estoque";

      // Se o erro veio como objeto com detalhes
      if (typeof msg === "object" && msg?.errors) {
        const erroMsg = msg.errors.map((e: any) => e.error).join("; ");
        addToast({
          title: "Erro ao dar entrada",
          description: erroMsg,
          type: "error",
        });
      } else {
        addToast({
          title: "Erro ao processar",
          description: String(msg),
          type: "error",
        });
      }
    } finally {
      setIsSaving(false);
      setIsProcessingEntry(false);
    }
  };

  const totalMapeados = dadosNFe
    ? dadosNFe.itens.filter((i) => !!vinculos[i.numeroItem]).length
    : 0;

  // ─── Render: Upload ──────────────────────────────────────────────────
  if (etapa === "upload") {
    return (
      <div className="space-y-6">
        <PageTitle
          title="Importar XML de NFe"
          leftSide={<BackButton fallbackUrl="/moves" />}
        />

        <Card>
          <CardHeader>
            <CardTitle>Upload da Nota Fiscal</CardTitle>
            <CardDescription>
              Selecione o arquivo XML da NFe para importar os dados e realizar a
              conferencia antes de dar entrada no estoque.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-all duration-200 cursor-pointer",
                dragActive
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
                isUploading && "pointer-events-none opacity-60",
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />

              {isUploading ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="font-medium text-lg">Processando XML...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Aguarde enquanto extraimos os dados da nota.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-full bg-primary/10 p-4">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-lg">
                      Clique para selecionar ou arraste o arquivo
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Apenas arquivos <strong>.xml</strong> de NFe (modelo 55)
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm">
                    Selecionar Arquivo
                  </Button>
                </>
              )}
            </div>

            {errorMessage && (
              <div className="flex items-start gap-3 mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Erro ao processar XML</p>
                  <p className="text-xs mt-0.5 opacity-80">{errorMessage}</p>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="shrink-0 opacity-60 hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Instrucoes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>
              1. Faca o download do XML da Nota Fiscal (portal da SEFAZ ou
              fornecedor).
            </p>
            <p>
              2. Arraste o arquivo ou clique na area acima para seleciona-lo.
            </p>
            <p>
              3. Revise os dados na conferencia e vincule os produtos ao
              estoque.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Render: Conferencia ─────────────────────────────────────────────
  if (etapa === "conferencia" && dadosNFe) {
    const { cabecalho, itens } = dadosNFe;

    return (
      <div className="space-y-6">
        <PageTitle
          title="Conferência de Nota Fiscal"
          leftSide={
            <Button variant="ghost" size="icon" onClick={handleReset}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          }
        />

        {/* ── Card de Cabeçalho ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Resumo da Nota</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                NFe {cabecalho.serie ? `Série ${cabecalho.serie}` : ""}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoItem
                icon={<Building2 className="h-4 w-4" />}
                label="Fornecedor"
                value={cabecalho.fornecedor}
              />
              <InfoItem
                icon={<Hash className="h-4 w-4" />}
                label="CNPJ"
                value={formatCNPJ(cabecalho.cnpj)}
              />
              <InfoItem
                icon={<Calendar className="h-4 w-4" />}
                label="Data de Emissão"
                value={formatDate(cabecalho.dataEmissao)}
              />
              <InfoItem
                icon={<BadgePercent className="h-4 w-4" />}
                label="Nº da Nota"
                value={cabecalho.numeroNota}
              />
              <InfoItem
                icon={<FileSpreadsheet className="h-4 w-4" />}
                label="Natureza da Operação"
                value={cabecalho.naturezaOperacao || "-"}
              />
              <InfoItem
                icon={<DollarSign className="h-4 w-4" />}
                label="Valor Total da Nota"
                value={formatCurrency(dadosNFe.valorTotalNota)}
                highlight
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Tabela de Itens ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <CardTitle>Itens da Nota</CardTitle>
              </div>
              <CardDescription>
                {itens.length} {itens.length === 1 ? "item" : "itens"}{" "}
                encontrado
                {itens.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead>Cód. Forn.</TableHead>
                    <TableHead className="min-w-[200px]">Produto</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-center">Un.</TableHead>
                    <TableHead className="text-right">Valor Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => (
                    <TableRow key={item.numeroItem}>
                      <TableCell className="text-center text-muted-foreground text-xs">
                        {item.numeroItem}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.codigoFornecedor}
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className="line-clamp-2">{item.descricao}</span>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {item.quantidade}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                            item.unidadeOriginal !== item.unidadeMapeada
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200",
                          )}
                        >
                          <Ruler className="h-3 w-3" />
                          {item.unidadeMapeada}
                          {item.unidadeOriginal !== item.unidadeMapeada && (
                            <span className="text-[10px] opacity-70">
                              (orig: {item.unidadeOriginal})
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.valorUnitario)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(item.valorTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ── Totais ── */}
        <div className="flex items-center justify-end gap-6 bg-muted/30 rounded-xl p-4 border">
          <div className="text-sm text-muted-foreground">
            Valor Total dos Produtos
          </div>
          <div className="text-xl font-bold text-foreground">
            {formatCurrency(dadosNFe.valorTotalProdutos)}
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-sm text-muted-foreground">
            Valor Total da Nota
          </div>
          <div className="text-xl font-bold text-primary">
            {formatCurrency(dadosNFe.valorTotalNota)}
          </div>
        </div>

        {/* ── Ações ── */}
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" onClick={handleReset}>
            <X className="h-4 w-4" />
            Cancelar
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/moves">Voltar para Movimentações</Link>
            </Button>
            <Button onClick={handleAvancarVinculo}>
              <ArrowRight className="h-4 w-4" />
              Avancar para Vinculo de Produtos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Vinculo de Produtos ──────────────────────────────────────
  if (etapa === "vinculo" && dadosNFe) {
    const { cabecalho, itens } = dadosNFe;

    return (
      <div className="space-y-6">
        <PageTitle
          title="Associacao de Produtos"
          leftSide={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEtapa("conferencia")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          }
        />

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Conferencia</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-semibold text-primary">
            Vinculo de Produtos
          </span>
          <span className="text-muted-foreground ml-2">
            ({totalMapeados}/{itens.length} associados)
          </span>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                <CardTitle>
                  Vincular Produtos do Fornecedor ao Estoque
                </CardTitle>
              </div>
              <CardDescription>
                Fornecedor: {cabecalho.fornecedor} - {cabecalho.numeroNota}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead>Cod. Forn.</TableHead>
                    <TableHead className="min-w-[180px]">
                      Item da Nota
                    </TableHead>
                    <TableHead className="text-center w-[60px]">Qtd</TableHead>
                    <TableHead className="min-w-[280px]">
                      Produto no Estoque Eletrosil
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => {
                    const jaMapeado = !!item.localProductId;
                    const vinculado = !!vinculos[item.numeroItem];

                    return (
                      <TableRow key={item.numeroItem}>
                        <TableCell className="text-center text-muted-foreground text-xs">
                          {item.numeroItem}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.codigoFornecedor}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-sm line-clamp-2">
                            {item.descricao}
                          </span>
                          <span className="text-xs text-muted-foreground block">
                            {item.unidadeMapeada} - R${" "}
                            {item.valorUnitario.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {item.quantidade}
                        </TableCell>
                        <TableCell>
                          {jaMapeado && vinculado ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 px-3 py-1 text-xs font-medium">
                                <CheckCircle2 className="h-3 w-3" />
                                Mapeado: {item.localProductName}
                              </span>
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                  placeholder="Buscar produto no estoque..."
                                  value={searchTerms[item.numeroItem] || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSearchTerms((prev) => ({
                                      ...prev,
                                      [item.numeroItem]: val,
                                    }));
                                    if (vinculos[item.numeroItem]) {
                                      handleClearProduct(item.numeroItem);
                                    }
                                  }}
                                  className="pl-8 h-9 text-sm"
                                />
                                {searchingItem === item.numeroItem && (
                                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                )}
                              </div>

                              {searchResults[item.numeroItem]?.length > 0 && (
                                <div className="absolute z-20 mt-1 w-full bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                  {searchResults[item.numeroItem].map(
                                    (prod) => (
                                      <div
                                        key={prod.id}
                                        className="px-3 py-2 hover:bg-muted cursor-pointer border-b last:border-0 text-sm flex items-center gap-2"
                                        onClick={() =>
                                          handleSelectProduct(
                                            item.numeroItem,
                                            prod,
                                          )
                                        }
                                      >
                                        <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span className="font-medium">
                                          {prod.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-auto">
                                          {prod.unitType}
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}

                              {!vinculos[item.numeroItem] &&
                                searchTerms[item.numeroItem]?.length >= 2 &&
                                searchResults[item.numeroItem]?.length === 0 &&
                                !searchingItem &&
                                !jaMapeado && (
                                  <div className="mt-2">
                                    <p className="text-xs text-muted-foreground mb-1.5">
                                      Nenhum produto encontrado
                                    </p>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-full gap-1.5 text-xs h-8"
                                      onClick={() => openQuickCreate(item)}
                                    >
                                      <PlusCircle className="h-3.5 w-3.5" />
                                      Cadastrar como Novo Produto
                                    </Button>
                                  </div>
                                )}

                              {vinculos[item.numeroItem] && !jaMapeado && (
                                <div className="mt-1.5 flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 text-xs font-medium">
                                    <Link2 className="h-3 w-3" />
                                    {vinculos[item.numeroItem]!.name}
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleClearProduct(item.numeroItem)
                                    }
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ── Seletor de Filial ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm">
                Dar entrada no estoque de qual filial?
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Select
              value={branchId}
              onValueChange={setBranchId}
              disabled={isLoadingBranches || isSaving}
            >
              <SelectTrigger className="w-full sm:w-[350px]">
                <SelectValue
                  placeholder={
                    isLoadingBranches
                      ? "Carregando filiais..."
                      : "Selecione a filial"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!branchId && !isLoadingBranches && (
              <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Selecione a filial para habilitar a conclusao
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Modal de Cadastro Rápido de Produto ── */}
        <Dialog
          open={quickCreateOpen}
          onOpenChange={(open) => {
            if (!open && !isCreatingProduct) {
              setQuickCreateOpen(false);
              setQuickCreateItem(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                Cadastrar Novo Produto
              </DialogTitle>
              <DialogDescription>
                Os dados foram preenchidos automaticamente com base no item da
                nota fiscal. Ajuste se necessario e clique em Salvar.
              </DialogDescription>
            </DialogHeader>

            {quickCreateItem && (
              <div className="space-y-4 py-2">
                {/* Nome do Produto */}
                <div className="space-y-1.5">
                  <Label htmlFor="quick-name">Nome do Produto</Label>
                  <Input
                    id="quick-name"
                    value={quickCreateItem.descricao}
                    readOnly
                    className="bg-muted text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Extraido da descricao do item na nota fiscal
                  </p>
                </div>

                {/* Categoria */}
                <div className="space-y-1.5">
                  <Label htmlFor="quick-category">Categoria</Label>
                  <Select
                    value={selectedCategoryId}
                    onValueChange={setSelectedCategoryId}
                  >
                    <SelectTrigger id="quick-category">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="placeholder" disabled>
                        Selecione uma categoria...
                      </SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Unidade e Preço lado a lado */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="quick-unit">Unidade</Label>
                    <Input
                      id="quick-unit"
                      value={quickCreateItem.unidadeMapeada.toUpperCase()}
                      readOnly
                      className="bg-muted text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="quick-price">Preco de Custo (R$)</Label>
                    <Input
                      id="quick-price"
                      value={formatCurrency(quickCreateItem.valorUnitario)}
                      readOnly
                      className="bg-muted text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Resumo do item */}
                <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium">Item #</span>
                    {quickCreateItem.numeroItem} -{" "}
                    {quickCreateItem.codigoFornecedor}
                  </p>
                  <p>
                    <span className="font-medium">Quantidade:</span>{" "}
                    {quickCreateItem.quantidade}{" "}
                    <span className="font-medium">Total:</span>{" "}
                    {formatCurrency(quickCreateItem.valorTotal)}
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setQuickCreateOpen(false);
                  setQuickCreateItem(null);
                }}
                disabled={isCreatingProduct}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateAndLinkProduct}
                disabled={isCreatingProduct || !selectedCategoryId}
              >
                {isCreatingProduct ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar e Vincular
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <X className="h-4 w-4" /> Cancelar
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setEtapa("conferencia")}>
              <ArrowLeft className="h-4 w-4" /> Voltar para Conferencia
            </Button>
            <Button
              onClick={handleConcluir}
              disabled={
                isSaving ||
                isProcessingEntry ||
                totalMapeados !== itens.length ||
                !branchId
              }
            >
              {isProcessingEntry ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Dando entrada no estoque...
                </>
              ) : isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando associacoes...
                </>
              ) : (
                <>
                  <ClipboardList className="h-4 w-4" />
                  Concluir e Dar Entrada no Estoque
                </>
              )}
            </Button>
          </div>
        </div>

        {totalMapeados < itens.length && (
          <p className="text-xs text-amber-600 text-right">
            {itens.length - totalMapeados} item(ns) ainda precisam ser
            associados.
          </p>
        )}
      </div>
    );
  }

  return null;
}

// ─── Subcomponente InfoItem ──────────────────────────────────────────────

function InfoItem({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
      <div
        className={cn(
          "mt-0.5 shrink-0",
          highlight ? "text-primary" : "text-muted-foreground",
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            "font-medium truncate",
            highlight && "text-primary font-bold text-lg",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
