"use client"

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Category } from "@/types/category";
import { upsertCategoryAction } from "@/actions/category";
import { FieldError } from "@/components/field-error";

type Props = {
    category?: Category;
}

const initialState = {
  error: '',
  fieldErrors: {} as Record<string, string[]>
}

export const CategoryForm = ({ category }: Props) => {
    const [state, action, isPending] = useActionState(upsertCategoryAction, initialState);

    return (
        <div className="p-4 max-w-2xl">
            <form action={action} className="space-y-6">
                {category && <input type="hidden" name="id" value={category.id} />}
                
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome da Categoria</Label>
                        <Input 
                            id="name" 
                            name="name" 
                            defaultValue={category?.name || ''} 
                            placeholder="Nome da categoria" 
                            required
                        />
                        <FieldError errors={state?.fieldErrors?.name} />
                    </div>
                </div>

                {state?.error && (
                    <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
                        {state.error}
                    </div>
                )}

                <Button type="submit" disabled={isPending}>
                    {isPending ? "Salvando..." : (category ? "Salvar Alterações" : "Criar Categoria")}
                </Button>
            </form>
        </div>
    );
}
