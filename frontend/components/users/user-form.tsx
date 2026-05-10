"use client"

import { useActionState, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Label,
} from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { User } from "@/types/user";
import { Branch } from "@/types/branch";
import { upsertUserAction } from "@/actions/user";
import { FieldError } from "@/components/field-error";
import { branchClientService } from "@/services/branch-client";

type Props = {
    user?: User;
}

const initialState = {
  error: '',
  fieldErrors: {} as Record<string, string[]>
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
    { value: "operator", label: "Operador de Caixa" },
    { value: "manager", label: "Gerente de Loja" },
    { value: "admin", label: "Admin Global" },
]

export const UserForm = ({ user }: Props) => {
    const [state, action, isPending] = useActionState(upsertUserAction, initialState);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedRole, setSelectedRole] = useState<string>(user?.role || "operator");
    const [selectedBranch, setSelectedBranch] = useState<string>(user?.branchId || "");
    const [branchesLoading, setBranchesLoading] = useState(true);

    // Busca filiais ao montar o formulário
    const fetchBranches = useCallback(async () => {
        setBranchesLoading(true);
        try {
            const res = await branchClientService.getBranches();
            setBranches(res?.data || []);
        } catch {
            setBranches([]);
        } finally {
            setBranchesLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

    // Se o perfil for Admin Global, reseta a filial
    const handleRoleChange = (value: string) => {
        setSelectedRole(value);
        if (value === "admin") {
            setSelectedBranch("");
        }
    };

    return (
        <div className="p-4 max-w-2xl">
            <form action={action} className="space-y-6">
                {user && <input type="hidden" name="id" value={user.id} />}
                
                {/* ── Nome ── */}
                <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input 
                        id="name"
                        name="name" 
                        defaultValue={user?.name || ''} 
                        placeholder="Nome do usuário" 
                    />
                    <FieldError errors={state?.fieldErrors?.name} />
                </div>

                {/* ── Email ── */}
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                        id="email"
                        name="email" 
                        defaultValue={user?.email || ''} 
                        placeholder="email@exemplo.com" 
                    />
                    <FieldError errors={state?.fieldErrors?.email} />
                </div>

                {/* ── Perfil de Acesso (role) ── */}
                <div className="space-y-2">
                    <Label htmlFor="role">Perfil de Acesso</Label>
                    <input type="hidden" name="role" value={selectedRole} />
                    <Select
                        value={selectedRole}
                        onValueChange={handleRoleChange}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o perfil" />
                        </SelectTrigger>
                        <SelectContent>
                            {ROLE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FieldError errors={state?.fieldErrors?.role} />
                </div>

                {/* ── Filial de Lotação (apenas se NÃO for Admin) ── */}
                {selectedRole !== "admin" && (
                    <div className="space-y-2">
                        <Label htmlFor="branchId">Unidade de Lotação</Label>
                        <input type="hidden" name="branchId" value={selectedBranch} />
                        <Select
                            value={selectedBranch}
                            onValueChange={setSelectedBranch}
                            disabled={branchesLoading}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue 
                                    placeholder={
                                        branchesLoading 
                                            ? "Carregando unidades..." 
                                            : "Selecione a unidade"
                                    } 
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.length === 0 && !branchesLoading && (
                                    <SelectItem value="" disabled>
                                        Nenhuma unidade disponível
                                    </SelectItem>
                                )}
                                {branches.map((branch) => (
                                    <SelectItem key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FieldError errors={state?.fieldErrors?.branchId} />
                        {selectedRole === "manager" && selectedBranch && (
                            <p className="text-xs text-muted-foreground">
                                O gerente terá acesso apenas aos dados desta unidade.
                            </p>
                        )}
                    </div>
                )}

                {/* ── Senha ── */}
                <div className="space-y-2">
                    <Label htmlFor="password">Senha {user && "(deixe em branco para manter)"}</Label>
                    <Input 
                        id="password"
                        name="password" 
                        type="password" 
                        placeholder="******" 
                    />
                    <FieldError errors={state?.fieldErrors?.password} />
                </div>

                {/* ── Avatar (apenas edição) ── */}
                {user && (
                    <div className="space-y-2">
                        <Label htmlFor="avatar">Avatar</Label>
                        <Input 
                            id="avatar"
                            name="avatar" 
                            type="file" 
                            accept="image/*"
                        />
                    </div>
                )}

                {state?.error && (
                    <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
                        {state.error}
                    </div>
                )}

                <Button type="submit" disabled={isPending}>
                    {isPending ? "Salvando..." : (user ? "Salvar Alterações" : "Criar Usuário")}
                </Button>
            </form>
        </div>
    );
}
