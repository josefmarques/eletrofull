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
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { authService } from "@/services/auth";
import { branchService } from "@/services/branch";

export const dynamic = 'force-dynamic';

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function MovesContent({ searchParams, branchName }: Props & { branchName: string }) {
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
                            <TableHead className="w-[120px]">Data</TableHead>
                            <TableHead className="w-[90px]">Tipo</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead className="w-[70px] text-center">Qtd</TableHead>
                            <TableHead className="w-[100px] text-right">Valor Unit.</TableHead>
                            <TableHead className="w-[220px]">Origem → Destino</TableHead>
                            <TableHead className="w-[160px]">Descrição</TableHead>
                            <TableHead className="w-[120px]">Responsável</TableHead>
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

export default async function Page({ searchParams }: Props) {
    const params = await searchParams;
    const [userRes, branchesRes] = await Promise.all([
        authService.getMe(),
        branchService.getBranches()
    ]);

    const user = userRes?.data;
    if (!user) {
        redirect("/login");
    }

    const isAdmin = user.isAdmin === true;
    const branches = branchesRes?.data || [];
    const urlBranchId = typeof params.branch === 'string' ? params.branch : undefined;
    
    // Admin ve o que esta na URL; usuario comum ve apenas a propria filial
    const effectiveBranchId = isAdmin ? urlBranchId : user.branchId;
    
    // Nome da unidade para o titulo dinamico
    const branchName = effectiveBranchId
        ? branches.find((b: any) => String(b.id) === String(effectiveBranchId))?.name
          || 'Unidade nao encontrada'
        : 'Todas as Unidades';

    return (
        <div className="space-y-6">
            <PageTitle
                title={`Movimentações - ${branchName}`}
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
                                <TableHead className="w-[120px]">Data</TableHead>
                                <TableHead className="w-[90px]">Tipo</TableHead>
                                <TableHead>Produto</TableHead>
                                <TableHead className="w-[70px] text-center">Qtd</TableHead>
                                <TableHead className="w-[100px] text-right">Valor Unit.</TableHead>
                                <TableHead className="w-[220px]">Origem → Destino</TableHead>
                                <TableHead className="w-[160px]">Descrição</TableHead>
                                <TableHead className="w-[120px]">Responsável</TableHead>
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
                <MovesContent searchParams={searchParams} branchName={branchName} />
            </Suspense>
        </div>
    );
}
