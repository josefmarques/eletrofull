import { dashboardService } from "@/services/dashboard";
import { MovesGraph } from "./moves-graph";
import { MoveGraphItem } from "@/types/dashboard";

interface MovesGraphContainerProps {
    startDate: string;
    endDate: string;
    branchId?: string;
}

export async function MovesGraphContainer({ startDate, endDate, branchId }: MovesGraphContainerProps) {
    const { data } = await dashboardService.getMovesGraph(startDate, endDate, branchId);

    // Preenche todos os dias do período (o backend já preenche com zeros, 
    // mas por garantia fazemos o merge local também)
    const dataMap = new Map(data?.map(item => [item.date, item]));
    const filledData: MoveGraphItem[] = [];

    const current = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        const existing = dataMap.get(dateStr);
        filledData.push({ 
            date: dateStr, 
            in: existing?.in || 0, 
            out: existing?.out || 0,
        });
        current.setDate(current.getDate() + 1);
    }

    return <MovesGraph data={filledData} />
}