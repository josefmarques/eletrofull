"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BranchSelectorProps {
    branches: { id: string; name: string }[];
}

export const BranchSelector = ({ branches }: BranchSelectorProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    // Pega a filial atual da URL ou define "all" como padrão
    const currentBranch = searchParams.get("branch") || "all";

    const handleBranchChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        
        if (value === "all") {
            params.delete("branch"); // Remove da URL se for "Rede Completa"
        } else {
            params.set("branch", value); // Adiciona o ID da filial na URL
        }

        // Atualiza a URL sem recarregar a página inteira
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <Select value={currentBranch} onValueChange={handleBranchChange}>
            <SelectTrigger className="w-auto min-w-[200px] bg-background border-muted-foreground/20">
                <SelectValue placeholder="Selecione a visão" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Rede Completa (Todas)</SelectItem>
                {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                        {b.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};