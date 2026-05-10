import { dashboardService } from "@/services/dashboard";
import { ProductList } from "./product-list";

interface StagnantListProps {
    startDate?: string;
    endDate?: string;
    branchId?: string; // <--- Adicionado para suportar o filtro multi-loja
}

export async function StagnantList({ startDate, endDate, branchId }: StagnantListProps) {
    // Busca produtos que não tiveram movimentação de saída no período e filial selecionados
    const { data } = await dashboardService.getStagnantProducts(startDate, endDate, branchId);
    
    return (
        <ProductList
            title="Produtos Estagnados"
            description={branchId ? "Sem giro nesta unidade" : "Sem giro na rede"}
            products={data || []}
            emptyMessage="Nenhum produto estagnado no período"
        />
    )
}