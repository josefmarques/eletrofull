import { BackButton } from "@/components/back-button";
import { PageTitle } from "@/components/page-title";
import { CategoryForm } from "@/components/categories/category-form";
import { categoryService } from "@/services/category";
import { redirect } from "next/navigation";
import { Category } from "@/types/category";

type Props = {
    params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
    const { id } = await params;

    const categoryRes = await categoryService.getCategoryById(id);

    if (categoryRes.error || !categoryRes.data) {
        console.error("Error fetching category for edit:", categoryRes.error);
        redirect('/categories');
    }

    const category = categoryRes.data as Category;

    return (
        <div>
            <PageTitle
                title={`Editar Categoria`}
                leftSide={
                    <BackButton fallbackUrl="/categories" />
                }
            />

            <CategoryForm category={category} />
        </div>
    );
}
