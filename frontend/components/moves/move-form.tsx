"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMoveAction } from "@/actions/move";
import { Product } from "@/types/product";
import { User } from "@/types/user";
import { searchProductsAction } from "@/actions/product";
import { formatCurrency } from "@/lib/utils";
import { Loader2, X, Store } from "lucide-react";
import { FieldError } from "@/components/field-error";

const initialState = {
  error: "",
  fieldErrors: {} as Record<string, string[]>,
};

interface MoveFormProps {
  user: User;
  branches: { id: string; name: string }[];
}

export const MoveForm = ({ user, branches }: MoveFormProps) => {
  const [state, action, isPending] = useActionState(
    createMoveAction,
    initialState,
  );

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Selection state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>(
    user.branchId || "",
  );

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      // Busca produtos filtrando o estoque pela filial selecionada
      if (searchTerm.length >= 2 && !selectedProduct) {
        setIsSearching(true);
        // Passa o selectedBranch para buscar o estoque específico da filial
        const res = await searchProductsAction(
          searchTerm,
          selectedBranch || undefined,
        );
        if (res.data) {
          setSearchResults(res.data);
        }
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedProduct, selectedBranch]);

  const handleSelectProduct = (product: Product) => {
    console.log("[MoveForm] Product selected:", product.name);
    setSelectedProduct(product);
    setSearchTerm(product.name);
    setSearchResults([]);
  };

  const handleClearSelection = () => {
    setSelectedProduct(null);
    setSearchTerm("");
    setSearchResults([]);
  };

  return (
    <div className="p-4 max-w-2xl">
      <form action={action} className="space-y-6">
        <input
          type="hidden"
          name="productId"
          value={selectedProduct?.id || ""}
        />

        {/* branchId: se não for admin, usa o branchId fixo do usuário. Se for admin, o select define */}
        {!user.isAdmin && (
          <input type="hidden" name="branchId" value={user.branchId || ""} />
        )}
        {user.isAdmin && (
          <input type="hidden" name="branchId" value={selectedBranch} />
        )}

        <div className="space-y-4">
          {/* SELEÇÃO DE FILIAL (Apenas para Admin) */}
          {user.isAdmin ? (
            <div className="space-y-2 p-4 bg-muted/30 rounded-lg border border-dashed">
              <Label className="flex items-center gap-2">
                <Store className="h-4 w-4" /> Unidade de Operação
              </Label>
              <Select
                value={selectedBranch}
                onValueChange={(val) => {
                  console.log("[MoveForm] Branch selected:", val);
                  setSelectedBranch(val);
                  handleClearSelection(); // Limpa produto se mudar de loja
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a loja para esta movimentação" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground italic">
                * Como administrador, você deve definir em qual estoque esta
                ação impactará.
              </p>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground px-1">
              Operando em: <strong>Loja Atual</strong>
            </div>
          )}

          {/* Product Search */}
          <div className="space-y-2 relative">
            <Label htmlFor="search">Produto</Label>
            <div className="relative">
              <Input
                id="search"
                placeholder={
                  selectedBranch
                    ? "Digite o nome do produto..."
                    : "Selecione uma loja primeiro"
                }
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (selectedProduct) setSelectedProduct(null);
                }}
                disabled={!!selectedProduct || !selectedBranch}
                className={
                  selectedProduct ? "bg-muted text-muted-foreground pr-10" : ""
                }
              />
              {selectedProduct && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {!selectedProduct && searchResults.length > 0 && (
              <div className="absolute z-10 w-full bg-background border rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    className="p-3 hover:bg-muted cursor-pointer border-b last:border-0"
                    onClick={() => handleSelectProduct(product)}
                  >
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Estoque nesta unidade: {product.quantity || 0}{" "}
                      {product.unitType}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select name="type" defaultValue="in">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Entrada (+)</SelectItem>
                  <SelectItem value="out">Saída (-)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="0.01"
                placeholder="0.00"
                required
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isPending || !selectedProduct}
          className="w-full"
        >
          {isPending ? "Salvando..." : "Confirmar Movimentação"}
        </Button>
      </form>
    </div>
  );
};
