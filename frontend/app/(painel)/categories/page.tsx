import { Pagination } from "@/components/pagination";
import { PageTitle } from "@/components/page-title";
import { CategoryItem } from "@/components/categories/category-item";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { categoryService } from "@/services/category";
import { Category } from "@/types/category";
import Link from "next/link";

const pageTitle = (
    <PageTitle
        title="Categorias"
        rightSide={
            <Link href="/categories/add">
                <Button>Nova Categoria</Button>
            </Link>
        }
    />
);

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Page({ searchParams }: Props) {
    const params = await searchParams;
    const page = typeof params.page === 'string' ? parseInt(params.page) : 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const categoriesRes = await categoryService.getAllCategories(true);
    const categories = (categoriesRes.data as Category[]) || [];
    const paginatedCategories = categories.slice(offset, offset + limit);

    if (categories.length === 0) {
        return (
            <div>
                {pageTitle}
                <EmptyState
                    message="Nenhuma categoria cadastrada."
                    label="Nova Categoria"
                    href="/categories/add"
                />
            </div>
        );
    }

    return (
        <div>
            {pageTitle}

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Produtos</TableHead>
                        <TableHead className="w-[150px]">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedCategories.map((item) => (
                        <CategoryItem key={item.id} category={item} />
                    ))}
                </TableBody>
            </Table>

            <Pagination limit={limit} count={categories.length} />
        </div>
    );
}
