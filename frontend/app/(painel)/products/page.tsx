import { Pagination } from "@/components/pagination";
import { PageTitle } from "@/components/page-title";
import { EmptyProducts } from "@/components/products/empty-products";
import { ProductItem } from "@/components/products/product-item";
import { ProductSearch } from "@/components/products/product-search";
import { BranchSelector } from "@/components/dashboard/branch-selector"; // <-- Importando o Seletor
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { productServerService as productService } from "@/services/product-server";
import { branchService } from "@/services/branch";
import { authService } from "@/services/auth";
import { Product } from "@/types/product";
import Link from "next/link";
import { redirect } from "next/navigation";

// Força a página a carregar sempre do servidor (evita erro de build com params de URL)
export const dynamic = 'force-dynamic';

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Page({ searchParams }: Props) {
    const params = await searchParams;
    const [userRes, branchesRes] = await Promise.all([
        authService.getMe(),
        branchService.getBranches()
    ]);

    const user = userRes?.data;
    
    // Trava de segurança
    if (!user) {
        redirect("/login");
    }

    const isAdmin = user.isAdmin === true;
    const isAdminGlobal = user.role === 'admin';
    const branches = branchesRes?.data || [];
    const urlBranchId = typeof params.branch === 'string' ? params.branch : undefined;
    const name = typeof params.name === 'string' ? params.name : undefined;

    // REGRA DE SEGURANÇA: Filial Efetiva
    // Admin vê o que está na URL, usuário comum vê apenas a própria filial
    const effectiveBranchId = isAdmin ? urlBranchId : user.branchId;

    // NOME DA FILIAL PARA O TÍTULO DINÂMICO (Tarefa 3 do Sprint 8)
    // Admin Global → "Rede Completa"
    // Manager/Operator → "[Nome da Filial]" (sempre a filial dele)
    const branchName = isAdminGlobal
        ? 'Rede Completa'
        : branches.find((b: any) => String(b.id) === String(effectiveBranchId))?.name 
          || 'Filial não encontrada';

    // PASSAMOS A FILIAL EFETIVA PARA A BUSCA NO BACKEND
    const productsRes = await productService.getProducts(effectiveBranchId); 
    const products = (productsRes?.data as Product[]) || [];

    const pageTitle = (
        <PageTitle
            title={`Produtos - ${branchName}`} // <-- Título Inteligente!
            rightSide={
                <Link href="/products/add">
                    <Button>Novo Produto</Button>
                </Link>
            }
        />
    );

    return (
        <div className="space-y-6">
            {pageTitle}
            
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-background p-4 rounded-lg border shadow-sm">
                <div className="w-full md:max-w-sm">
                    <ProductSearch />
                </div>
                
                {/* Renderiza o seletor apenas se for Admin e tiver filiais */}
                {isAdmin && branches.length > 0 && (
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <BranchSelector branches={branches} />
                    </div>
                )}
            </div>

            {products.length === 0 ? (
                <div className="text-center p-12 border rounded-lg bg-muted/20 text-muted-foreground">
                    Nenhum produto encontrado.
                </div>
            ) : (
                <div className="border rounded-lg bg-background overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="font-semibold">Nome</TableHead>
                                <TableHead className="hidden lg:table-cell font-semibold">Categoria</TableHead>
                                <TableHead className="w-[140px] text-right font-semibold">Preço Unit.</TableHead>
                                <TableHead className="w-[160px] text-center text-primary font-bold bg-primary/5">
                                    Estoque {effectiveBranchId ? '(Filial)' : '(Geral)'}
                                </TableHead>
                                <TableHead className="w-[100px] text-right font-semibold">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((item, index) => (
                                <ProductItem key={`${item.id}-${index}`} product={item} />
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}