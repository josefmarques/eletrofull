import { dashboardService } from "@/services/dashboard";
import { ProductList } from "./product-list";

// Adicionamos a prop branchId para filtrar o alerta de estoque
export async function LowStockList({ branchId }: { branchId?: string }) {
    // O serviço agora busca apenas os produtos críticos daquela unidade
    const { data } = await dashboardService.getLowStock(branchId);
    
    return (
        <ProductList
            title="Estoque Baixo"
            description={branchId ? "Críticos nesta unidade" : "Críticos em toda a rede"}
            products={data || []}
            emptyMessage="Nenhum produto com estoque baixo"
        />
    )
}