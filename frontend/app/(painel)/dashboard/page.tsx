import { Suspense } from "react"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { DashboardFilter } from "@/components/dashboard/dashboard-filter"
import { BranchSelector } from "@/components/dashboard/branch-selector" // <-- Importado aqui
import { InventoryValueCard } from "@/components/dashboard/inventory-value-card"
import { MovesCards } from "@/components/dashboard/moves-cards"
import { MovesGraphContainer } from "@/components/dashboard/moves-graph-container"
import { LowStockList } from "@/components/dashboard/low-stock-list"
import { StagnantList } from "@/components/dashboard/stagnant-list"
import { SummaryCardSkeleton } from "@/components/dashboard/summary-card"
import { MovesGraphSkeleton } from "@/components/dashboard/moves-graph"
import { ProductListSkeleton } from "@/components/dashboard/product-list"
import { PageTitle } from "@/components/page-title"
import { formatDateToYYYYMMDD } from "@/lib/utils"
import { authService } from "@/services/auth"
import { getServerApi } from "@/lib/server-api"

const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || "Eletrosil";

export const metadata: Metadata = {
  title: `${companyName} — Dashboard`
};

export default async function DashboardPage(props: {
    searchParams: Promise<{ period?: string; branch?: string }>
}) {
    // 1. Buscamos dados do usuário
    const result = await authService.getMe()
    
    // Se houver erro ou não houver dados do usuário
    if (result.error || !result.data) {
        redirect("/login")
    }
    
    const user = result.data

    // 2. Resolvemos os parâmetros da URL
    const searchParams = await props.searchParams
    const rawPeriod = searchParams.period ? parseInt(searchParams.period) : 7
    const period = isNaN(rawPeriod) ? 7 : rawPeriod
    const urlBranchId = searchParams.branch || undefined // Pega o ID da filial da URL

    // 3. Buscamos a lista de filiais (Apenas se for admin)
    let branches = []
    if (user.isAdmin) {
        try {
            const api = await getServerApi()
            const response = await api.get('/branches')
            branches = response.data.data
        } catch (error) {
            console.error("Erro ao carregar filiais para o filtro:", error)
        }
    }

    // 4. REGRA DE NEGÓCIO CRÍTICA: Definindo a filial efetiva
    // Se for admin, usa a filial da URL (ou undefined para Rede Completa).
    // Se NÃO for admin, ignora a URL e trava na filial do usuário.
    const effectiveBranchId = user.isAdmin ? urlBranchId : user.branchId

    // 5. Lógica de datas
    const today = new Date()
    const endDate = formatDateToYYYYMMDD(today)
    const start = new Date(today)
    start.setDate(today.getDate() - period + 1)
    const startDate = formatDateToYYYYMMDD(start)

    return (
        <div className="space-y-8">
            <PageTitle 
                title="Dashboard" 
                rightSide={
                    <div className="flex items-center gap-2">
                        {/* Seletor de Filiais: Aparece apenas para Admins */}
                        {user.isAdmin && branches.length > 0 && (
                            <BranchSelector branches={branches} />
                        )}
                        
                        {/* Seu filtro existente (agora focado apenas no período de dias) */}
                        <DashboardFilter />
                    </div>
                } 
            />

            <div className="grid gap-4 md:grid-cols-3">
                <Suspense fallback={<SummaryCardSkeleton />}>
                    {/* Usando effectiveBranchId ao invés do raw branchId */}
                    <InventoryValueCard branchId={effectiveBranchId} />
                </Suspense>

                <Suspense fallback={<>
                    <SummaryCardSkeleton />
                    <SummaryCardSkeleton />
                </>}>
                    <MovesCards startDate={startDate} endDate={endDate} branchId={effectiveBranchId} />
                </Suspense>
            </div>

            <Suspense fallback={<MovesGraphSkeleton />}>
                <MovesGraphContainer startDate={startDate} endDate={endDate} branchId={effectiveBranchId} />
            </Suspense>

            <div className="grid gap-4 md:grid-cols-2">
                <Suspense fallback={<ProductListSkeleton />}>
                    <LowStockList branchId={effectiveBranchId} />
                </Suspense>

                <Suspense fallback={<ProductListSkeleton />}>
                    <StagnantList startDate={startDate} endDate={endDate} branchId={effectiveBranchId} />
                </Suspense>
            </div>
        </div>
    )
}