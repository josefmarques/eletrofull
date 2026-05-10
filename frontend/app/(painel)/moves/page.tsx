import { Pagination } from "@/components/pagination";
import { PageTitle } from "@/components/page-title";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { moveService } from "@/services/move";
import { Move } from "@/types/move";
import { MoveItem } from "@/components/moves/move-item";
import { MoveItemSkeleton } from "@/components/moves/move-item-skeleton";
import { FileUp, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = 'force-dynamic';

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function MovesContent({ searchParams }: Props) {
    const params = await searchParams;
    const page = typeof params.page === 'string' ? parseInt(params.page) : 1;
    const branchId = typeof params.branch === 'string' ? params.branch : undefined;
    
    const limit = 10;
    const offset = (page - 1) * limit;

    const movesRes = await moveService.getMoves(offset, limit, undefined, branchId);
    const moves = (movesRes.data as Move[]) || [];

    const currentCount = moves.length;
    const hasMore = currentCount === limit;
    const count = hasMore ? (page * limit + 1) : ((page - 1) * limit + currentCount);

    if (moves.length === 0 && page === 1) {
        return (
            <EmptyState
                message={branchId ? "Nenhuma movimentação encontrada nesta filial." : "Nenhuma movimentação registrada."}
                label="Nova Movimentação"
                href="/moves/add"
            />
        );
    }

    return (
        <>
            <div className="border rounded-lg bg-background">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[150px]">Data</TableHead>
                            <TableHead className="w-[100px]">Tipo</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead className="w-[80px] text-center">Qtd</TableHead>
                            <TableHead className="w-[120px] text-right">Valor Unit.</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {moves.map((item) => (
                            <MoveItem key={item.id} move={item} />
                        ))}
                    </TableBody>
                </Table>
            </div>
            <Pagination limit={limit} count={count} />
        </>
    );
}

export default function Page({ searchParams }: Props) {
    return (
        <div className="space-y-6">
            <PageTitle
                title="Movimentações"
                rightSide={
                    <div className="flex items-center gap-2">
                        <Link href="/moves/import">
                            <Button variant="outline">
                                <FileUp className="h-4 w-4" />
                                Importar XML
                            </Button>
                        </Link>
                        <Link href="/moves/add">
                            <Button>Nova Movimentação</Button>
                        </Link>
                        <Link href="/moves/transfer">
                            <Button variant="outline">
                                <ArrowRightLeft className="h-4 w-4" />
                                Transferência
                            </Button>
                        </Link>
                    </div>
                }
            />
            <Suspense fallback={
                <div className="border rounded-lg bg-background">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[150px]">Data</TableHead>
                                <TableHead className="w-[100px]">Tipo</TableHead>
                                <TableHead>Produto</TableHead>
                                <TableHead className="w-[80px] text-center">Qtd</TableHead>
                                <TableHead className="w-[120px] text-right">Valor Unit.</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <MoveItemSkeleton key={i} />
                            ))}
                        </TableBody>
                    </Table>
                </div>
            }>
                <MovesContent searchParams={searchParams} />
            </Suspense>
        </div>
    );
}