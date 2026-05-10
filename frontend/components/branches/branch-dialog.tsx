"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/field-error";
import { Branch } from "@/types/branch";
import { upsertBranchAction } from "@/actions/branch";
import { Plus, Pencil } from "lucide-react";

type Props = {
  branch?: Branch; // Se fornecido, está no modo EDIÇÃO
  onSuccess?: () => void;
};

const initialState = {
  error: null as string | null,
  fieldErrors: {} as Record<string, string[]>,
};

export function BranchDialog({ branch, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(upsertBranchAction, initialState);

  const isEditing = !!branch;

  // ── Controle manual do Dialog ──
  // NOTA: Não usamos auto-close via useEffect porque o server action
  // `upsertBranchAction` já faz redirect('/branches') em caso de sucesso,
  // o que desmonta o componente e fecha o dialog naturalmente.
  // Em caso de erro, o state retorna com a mensagem de erro e o dialog
  // permanece aberto para exibição.

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button size="sm" variant="outline" title="Editar unidade">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="size-4 mr-2" />
            Nova Unidade
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form action={action}>
          {branch && <input type="hidden" name="id" value={branch.id} />}

          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Unidade" : "Nova Unidade"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Altere os campos abaixo para atualizar a unidade."
                : "Preencha os dados para cadastrar uma nova unidade."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* ── Nome ── */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Unidade</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: Loja Matriz Centro"
                defaultValue={branch?.name || ""}
                required
              />
              <FieldError errors={state?.fieldErrors?.name} />
            </div>

            {/* ── Endereço ── */}
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Textarea
                id="address"
                name="address"
                placeholder="Rua, número, bairro, cidade..."
                defaultValue={branch?.address || ""}
                rows={3}
              />
              <FieldError errors={state?.fieldErrors?.address} />
            </div>
          </div>

          {/* ── Erro global ── */}
          {state?.error && state.error !== "Erro de validação" && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-md px-3 py-2 mb-4">
              {state.error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
