import { BackButton } from "@/components/back-button";
import { PageTitle } from "@/components/page-title";
import { ProductForm } from "@/components/products/product-form";
import { categoryService } from "@/services/category";
import { Category } from "@/types/category";

export default async function Page() {
    const categoriesRes = await categoryService.getAllCategories();
    const categories = (categoriesRes.data as Category[]) || [];

    if (categoriesRes.error) {
        console.error("Failed to load categories", categoriesRes.error);
    }

    return (
        <div>
            <PageTitle
                title="Novo Produto"
                leftSide={
                    <BackButton fallbackUrl="/products" />
                }
            />

            <ProductForm categories={categories} />
        </div>
    );
}
