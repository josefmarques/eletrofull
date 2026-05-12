import { Suspense } from "react";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { authService } from "@/services/auth";
import { getServerApi } from "@/lib/server-api";
import { Customer } from "@/types/sale";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search, Phone, User, FileText } from "lucide-react";

export const dynamic = 'force-dynamic';

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function CustomersTable() {
    const api = await getServerApi();
    
    try {
        const response = await api.get('/customers', {
            params: { limit: 100 }
        });
        
        const customers: Customer[] = response.data?.data || [];

        if (customers.length === 0) {
            return (
                <div className="text-center p-12 border rounded-lg bg-muted/20 text-muted-foreground">
                    <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">Nenhum cliente cadastrado</p>
                    <p className="text-sm mt-1">Cadastre clientes no PDV ou através do formulário.</p>
                </div>
            );
        }

        return (
            <div className="border rounded-lg bg-background overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="font-semibold">Nome</TableHead>
                            <TableHead className="font-semibold">CPF/CNPJ</TableHead>
                            <TableHead className="hidden md:table-cell font-semibold">Telefone</TableHead>
                            <TableHead className="w-[120px] text-right font-semibold">Pontos</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {customers.map((customer) => (
                            <TableRow key={customer.id} className="hover:bg-muted/50">
                                <td className="px-4 py-3 font-medium">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span>{customer.name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="font-mono text-sm">
                                            {customer.cpfCnpj || "—"}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 hidden md:table-cell">
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span>{customer.phone || "—"}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right font-semibold">
                                    {customer.points ?? 0}
                                </td>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="px-4 py-3 border-t text-sm text-muted-foreground">
                    Total: {customers.length} cliente(s)
                </div>
            </div>
        );
    } catch (error) {
        console.error('[CustomersPage] Error fetching customers:', error);
        return (
            <div className="text-center p-12 border rounded-lg bg-destructive/5 text-destructive">
                <p className="text-lg font-medium">Erro ao carregar clientes</p>
                <p className="text-sm mt-1">Entre em contato com o suporte.</p>
            </div>
        );
    }
}

export default async function CustomersPage({ searchParams }: Props) {
    const params = await searchParams;
    const userRes = await authService.getMe();
    const user = userRes?.data;

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="space-y-6">
            <PageTitle
                title="Clientes"
                rightSide={
                    <Link href="/pdv">
                        <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Cliente (PDV)
                        </Button>
                    </Link>
                }
            />

            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-4 py-3 rounded-lg border">
                <Search className="h-4 w-4" />
                <span>
                    Clientes cadastrados no sistema. 
                    Para buscar por nome ou CPF, utilize o campo de busca no PDV.
                </span>
            </div>

            <Suspense fallback={
                <div className="text-center p-12 border rounded-lg bg-muted/20 text-muted-foreground">
                    <p>Carregando clientes...</p>
                </div>
            }>
                <CustomersTable />
            </Suspense>
        </div>
    );
}
