"use client"

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Label,
} from "@/components/ui/label";
import { Category } from "@/types/category";
import { fromCents } from "@/lib/utils";
import { upsertProductAction } from "@/actions/product";
import { Product } from "@/types/product";
import { FieldError } from "@/components/field-error";

type Props = {
    categories: Category[];
    product?: Product;
}

const initialState = {
    error: '',
    fieldErrors: {} as Record<string, string[]>
}

export const ProductForm = ({ categories, product }: Props) => {
    const [state, action, isPending] = useActionState(upsertProductAction, initialState);

    // Initial values logic
    const defaultUnitType = product?.unitType || "un";

    return (
        <div className="p-4 max-w-2xl">
            <form action={action} className="space-y-6">
                {product && <input type="hidden" name="id" value={product.id} />}

                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome do Produto</Label>
                        <Input
                            id="name"
                            name="name"
                            defaultValue={product?.name || ''}
                            placeholder="Nome do produto"
                        />
                        <FieldError errors={state?.fieldErrors?.name} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="categoryId">Categoria</Label>
                        <Select name="categoryId" defaultValue={product?.categoryId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FieldError errors={state?.fieldErrors?.categoryId} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="unitPrice">Preço Unitário (em R$)</Label>
                            <Input
                                id="unitPrice"
                                name="unitPrice"
                                type="number"
                                step="0.01"
                                defaultValue={product ? fromCents(product.unitPrice) : 0}
                            />
                            <FieldError errors={state?.fieldErrors?.unitPrice} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="unitType">Unidade de Medida</Label>
                            <Select name="unitType" defaultValue={defaultUnitType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="un">Unidade (un)</SelectItem>
                                    <SelectItem value="cx">Caixa (cx)</SelectItem>
                                    <SelectItem value="rl">Rolo (rl)</SelectItem>
                                    <SelectItem value="m">Metro (m)</SelectItem>
                                    <SelectItem value="pc">Peça (pc)</SelectItem>
                                    <SelectItem value="kg">Quilograma (kg)</SelectItem>
                                    <SelectItem value="lt">Litro (lt)</SelectItem>
                                    <SelectItem value="par">Par (par)</SelectItem>
                                    <SelectItem value="cj">Conjunto (cj)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FieldError errors={state?.fieldErrors?.unitType} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="quantity">Qtd. Atual</Label>
                            <Input
                                id="quantity"
                                name="quantity"
                                type="number"
                                defaultValue={product?.quantity ?? 0}
                            />
                            <FieldError errors={state?.fieldErrors?.quantity} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="minimumQuantity">Qtd. Mínima</Label>
                            <Input
                                id="minimumQuantity"
                                name="minimumQuantity"
                                type="number"
                                defaultValue={product?.minimumQuantity ?? 0}
                            />
                            <FieldError errors={state?.fieldErrors?.minimumQuantity} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maximumQuantity">Qtd. Máxima</Label>
                            <Input
                                id="maximumQuantity"
                                name="maximumQuantity"
                                type="number"
                                defaultValue={product?.maximumQuantity ?? 0}
                            />
                            <FieldError errors={state?.fieldErrors?.maximumQuantity} />
                        </div>
                    </div>
                </div>

                {state?.error && (
                    <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
                        {state.error}
                    </div>
                )}

                <Button type="submit" disabled={isPending}>
                    {isPending ? "Salvando..." : (product ? "Salvar Alterações" : "Criar Produto")}
                </Button>
            </form>
        </div>
    );
}
