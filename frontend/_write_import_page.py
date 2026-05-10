#!/usr/bin/env python3
"""Script para reescrever o arquivo import/page.tsx com o fluxo completo de 3 etapas."""

import os

filepath = os.path.join(os.path.dirname(__file__), "app", "(painel)", "moves", "import", "page.tsx")

content = r'''"use client";

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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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

// ─── Componente Principal ─────────────────────────────────────────────────

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

  // Estado do Vínculo
  const [vinculos, setVinculos] = useState<Record<number, ProdutoLocal | null>>({});
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
  const [searchResults, setSearchResults] = useState<Record<number, ProdutoLocal[]>>({});
  const [searchingItem, setSearchingItem] = useState<number | null>(null);

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
        addToast({ title: "Erro ao processar XML", description: msg, type: "error" });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [addToast],
  );

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

  const handleConcluir = async () => {
    if (!dadosNFe) return;

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

    setIsSaving(true);

    try {
      const api = getClientApi();
      const payload = {
        mappings: dadosNFe.itens.map((item) => ({
          supplierCnpj: dadosNFe.cabecalho.cnpj,
          supplierProductCode: item.codigoFornecedor,
          localProductId: vinculos[item.numeroItem]!.id,
        })),
      };

      await api.post("/moves/import/map-products", payload);

      addToast({
        title: "Associacao concluida!",
        description: `${payload.mappings.length} produto(s) mapeado(s) com sucesso. O sistema aprendeu os vinculos para notas futuras.`,
        type: "success",
      });

      console.log("[ImportNFe] Associacoes salvas:", payload);
      handleReset();
      router.push("/moves");
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Erro ao salvar associacoes";
      addToast({ title: "Erro ao salvar", description: msg, type: "error" });
    } finally {
      setIsSaving(false);
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
              Selecione o arquivo XML da NFe para importar os dados e realizar
              a conferencia antes de dar entrada no estoque.
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
            <p>1. Faca o download do XML da Nota Fiscal (portal da SEFAZ ou fornecedor).</p>
            <p>2. Arraste o arquivo ou clique na area acima para seleciona-lo.</p>
            <p>3. Revise os dados na conferencia e vincule os produtos ao estoque.</p>
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
          title="Conferencia de Nota Fiscal"
          leftSide={
            <Button variant="ghost" size="icon" onClick={handleReset}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Resumo da Nota</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                NFe {cabecalho.serie ? `Serie ${cabecalho.serie}` : ""}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoItem icon={<Building2 className="h-4 w-4" />} label="Fornecedor" value={cabecalho.fornecedor} />
              <InfoItem icon={<Hash className="h-4 w-4" />} label="CNPJ" value={formatCNPJ(cabecalho.cnpj)} />
              <InfoItem icon={<Calendar className="h-4 w-4" />} label="Data de Emissao" value={formatDate(cabecalho.dataEmissao)} />
              <InfoItem icon={<BadgePercent className="h-4 w-4" />} label="N da Nota" value={cabecalho.numeroNota} />
              <InfoItem icon={<FileSpreadsheet className="h-4 w-4" />} label="Natureza da Operacao" value={cabecalho.naturezaOperacao || "-"} />
              <InfoItem icon={<DollarSign className="h-4 w-4" />} label="Valor Total da Nota" value={formatCurrency(dadosNFe.valorTotalNota)} highlight />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <CardTitle>Itens da Nota</CardTitle>
              </div>
              <CardDescription>
                {itens.length} {itens.length === 1 ? "item" : "itens"} encontrado{itens.length !== 1 ? "s" : ""}
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
                      <TableCell className="text-center text-muted-foreground text-xs">{item.numeroItem}</TableCell>
                      <TableCell className="font-mono text-xs">{item.codigoFornecedor}</TableCell>
                      <TableCell className="font-medium">
                        <span className="line-clamp-2">{item.descricao}</span>
                      </TableCell>
                      <TableCell className="text-center font-mono">{item.quantidade}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                          item.unidadeOriginal !== item.unidadeMapeada
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200",
                        )}>
                          <Ruler className="h-3 w-3" />
                          {item.unidadeMapeada}
                          {item.unidadeOriginal !== item.unidadeMapeada && (
                            <span className="text-[10px] opacity-70">(orig: {item.unidadeOriginal})</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.valorUnitario)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatCurrency(item.valorTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-6 bg-muted/30 rounded-xl p-4 border">
          <div className="text-sm text-muted-foreground">Valor Total dos Produtos</div>
          <div className="text-xl font-bold text-foreground">{formatCurrency(dadosNFe.valorTotalProdutos)}</div>
          <div className="h-8 w-px bg-border" />
          <div className="text-sm text-muted-foreground">Valor Total da Nota</div>
          <div className="text-xl font-bold text-primary">{formatCurrency(dadosNFe.valorTotalNota)}</div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" onClick={handleReset}>
            <X className="h-4 w-4" /> Cancelar
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/moves">Voltar para Movimentacoes</Link>
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
            <Button variant="ghost" size="icon" onClick={() => setEtapa("conferencia")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          }
        />

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Conferencia</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-semibold text-primary">Vinculo de Produtos</span>
          <span className="text-muted-foreground ml-2">
            ({totalMapeados}/{itens.length} associados)
          </span>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                <CardTitle>Vincular Produtos do Fornecedor ao Estoque</CardTitle>
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
                    <TableHead className="min-w-[180px]">Item da Nota</TableHead>
                    <TableHead className="text-center w-[60px]">Qtd</TableHead>
                    <TableHead className="min-w-[280px]">Produto no Estoque Eletrosil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => {
                    const jaMapeado = !!item.localProductId;
                    const vinculado = !!vinculos[item.numeroItem];

                    return (
                      <TableRow key={item.numeroItem}>
                        <TableCell className="text-center text-muted-foreground text-xs">{item.numeroItem}</TableCell>
                        <TableCell className="font-mono text-xs">{item.codigoFornecedor}</TableCell>
                        <TableCell>
                          <span className="font-medium text-sm line-clamp-2">{item.descricao}</span>
                          <span className="text-xs text-muted-foreground block">
                            {item.unidadeMapeada} - R$ {item.valorUnitario.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-mono">{item.quantidade}</TableCell>
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
                                  {searchResults[item.numeroItem].map((prod) => (
                                    <div
                                      key={prod.id}
                                      className="px-3 py-2 hover:bg-muted cursor-pointer border-b last:border-0 text-sm flex items-center gap-2"
                                      onClick={() => handleSelectProduct(item.numeroItem, prod)}
                                    >
                                      <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      <span className="font-medium">{prod.name}</span>
                                      <span className="text-xs text-muted-foreground ml-auto">{prod.unitType}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {vinculos[item.numeroItem] && !jaMapeado && (
                                <div className="mt-1.5 flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 text-xs font-medium">
                                    <Link2 className="h-3 w-3" />
                                    {vinculos[item.numeroItem]!.name}
                                  </span>
                                  <button
                                    onClick={() => handleClearProduct(item.numeroItem)}
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

        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" onClick={handleReset}>
            <X className="h-4 w-4" /> Cancelar
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setEtapa("conferencia")}>
              <ArrowLeft className="h-4 w-4" /> Voltar para Conferencia
            </Button>
            <Button
              onClick={handleConcluir}
              disabled={isSaving || totalMapeados !== itens.length}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Concluir Associacao e Entrar no Estoque
                </>
              )}
            </Button>
          </div>
        </div>

        {totalMapeados < itens.length && (
          <p className="text-xs text-amber-600 text-right">
            {itens.length - totalMapeados} item(ns) ainda precisam ser associados.
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
      <div className={cn("mt-0.5 shrink-0", highlight ? "text-primary" : "text-muted-foreground")}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("font-medium truncate", highlight && "text-primary font-bold text-lg")}>
          {value}
        </p>
      </div>
    </div>
  );
}
'''

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ Arquivo escrito com sucesso: {filepath}")
print(f"   Tamanho: {len(content)} caracteres")
