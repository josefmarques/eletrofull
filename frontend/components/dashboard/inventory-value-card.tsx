import { dashboardService } from "@/services/dashboard";
import { SummaryCard } from "./summary-card";
import { DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Agora o componente aceita a propriedade branchId vinda da Page
export async function InventoryValueCard({ branchId }: { branchId?: string }) {
    const { data } = await dashboardService.getInventoryValue(branchId);
    const value = data?.totalValue || 0;
    const totalItems = data?.totalItems || 0;

    return (
        <SummaryCard
            title="Valor em Estoque"
            value={formatCurrency(value)}
            icon={DollarSign}
            description={`${totalItems} ${totalItems === 1 ? 'produto' : 'produtos'} em estoque`}
        />
    )
}