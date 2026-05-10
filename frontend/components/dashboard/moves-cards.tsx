import { dashboardService } from "@/services/dashboard";
import { SummaryCard } from "./summary-card";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface MovesCardsProps {
    startDate?: string;
    endDate?: string;
    branchId?: string; // <--- Adicionado para suportar o filtro multi-loja
}

export async function MovesCards({ startDate, endDate, branchId }: MovesCardsProps) {
    // Agora passamos o branchId para o serviço buscar os dados filtrados
    const { data } = await dashboardService.getMovesSummary(startDate, endDate, branchId);

    const inValue = data?.in.value || 0;
    const inCount = data?.in.count || 0;

    const outValue = data?.out.value || 0;
    const outCount = data?.out.count || 0;

    return (
        <>
            <SummaryCard
                title="Entradas no Período"
                value={formatCurrency(inValue)}
                icon={ArrowDownIcon}
                description={branchId ? `${inCount} movimentações nesta unidade` : `${inCount} movimentações na rede`}
            />
            <SummaryCard
                title="Saídas no Período"
                value={formatCurrency(outValue)}
                icon={ArrowUpIcon}
                description={branchId ? `${outCount} movimentações nesta unidade` : `${outCount} movimentações na rede`}
            />
        </>
    )
}