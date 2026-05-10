"use client";

import { useState, useEffect } from "react";
import { PageTitle } from "@/components/page-title";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { branchClientService } from "@/services/branch-client";
import { Branch } from "@/types/branch";
import { BranchDialog } from "@/components/branches/branch-dialog";
import { Building2 } from "lucide-react";

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBranches = async () => {
        setLoading(true);
        try {
            const res = await branchClientService.getBranches();
            setBranches(res?.data || []);
        } catch {
            setBranches([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    if (loading) {
        return (
            <div>
                <PageTitle
                    title="Unidades"
                    rightSide={
                        <BranchDialog onSuccess={fetchBranches} />
                    }
                />
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                    Carregando unidades...
                </div>
            </div>
        );
    }

    return (
        <div>
            <PageTitle
                title="Unidades"
                rightSide={
                    <BranchDialog onSuccess={fetchBranches} />
                }
            />

            {branches.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <p className="mb-4">Nenhuma unidade cadastrada.</p>
                    <BranchDialog onSuccess={fetchBranches} />
                </div>
            ) : (
                <>
                    <div className="rounded-lg border mb-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60px]">#</TableHead>
                                    <TableHead>Nome da Unidade</TableHead>
                                    <TableHead>Endereço</TableHead>
                                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {branches.map((branch, index) => (
                                    <TableRow key={branch.id}>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="size-4 text-muted-foreground shrink-0" />
                                                {branch.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {branch.address || (
                                                <span className="italic text-xs">Não informado</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <BranchDialog
                                                branch={branch}
                                                onSuccess={fetchBranches}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        Total de {branches.length} unidades cadastradas.
                    </p>
                </>
            )}
        </div>
    );
}
