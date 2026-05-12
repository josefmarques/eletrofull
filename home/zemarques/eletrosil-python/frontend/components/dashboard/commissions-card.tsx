import { TrendingUp } from "lucide-react";
import { SummaryCard } from "./summary-card";
import { getServerApi } from "@/lib/server-api";

interface CommissionsCardProps {
    branchId?: string;
    startDate?: string;
    endDate?: string;
}

export async function CommissionsCard({ branchId, startDate, endDate }: CommissionsCardProps) {
    try {
        const api = await getServerApi();
        const params: Record<string, string> = {};
        if (branchId) params.branchId = branchId;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        
        const response = await api.get('/sales/commissions', { params });
        const commissions = response.data?.data || [];
        
        const totalCommission = commissions.reduce(
            (acc: number, item: any) => acc + (item.total_commission || 0),
            0
        );
        
        const totalValue = commissions.reduce(
            (acc: number, item: any) => acc + (item.total_value || 0),
            0
        );

        const sellerCount = commissions.length;

        return (
            <SummaryCard
                title="Comissões (Vendedores)"
                value={`R$ ${totalCommission.toFixed(2)}`}
                description={
                    sellerCount > 0
                        ? `${sellerCount} vendedor(es) | R$ ${totalValue.toFixed(2)} em vendas`
                        : "Nenhuma comissão no período"
                }
                icon={TrendingUp}
            />
        );
    } catch (error) {
        console.error('[CommissionsCard] Error:', error);
        return (
            <SummaryCard
                title="Comissões (Vendedores)"
                value="—"
                description="Erro ao carregar"
                icon={TrendingUp}
            />
        );
    }
}
