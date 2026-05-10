import { BackButton } from "@/components/back-button";
import { PageTitle } from "@/components/page-title";
import { ProductForm } from "@/components/products/product-form";
import { categoryService } from "@/services/category";
import { productServerService as productService } from "@/services/product-server";
import { redirect } from "next/navigation";
import { Product } from "@/types/product";
import { Category } from "@/types/category";

type Props = {
    params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
    const { id } = await params;

    const productReq = productService.getProductById(id);
    const categoriesReq = categoryService.getAllCategories();

    const [productRes, categoriesRes] = await Promise.all([productReq, categoriesReq]);

    if (productRes.error || !productRes.data) {
        console.error("Error fetching data for edit:", productRes.error);
        redirect('/products');
    }

    const product = productRes.data as Product;
    const categories = (categoriesRes.data as Category[]) || [];

    return (
        <div>
            <PageTitle
                title={`Editar Produto`}
                leftSide={
                    <BackButton fallbackUrl="/products" />
                }
            />

            <ProductForm
                categories={categories}
                product={product}
            />
        </div>
    );
}
