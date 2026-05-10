import { BackButton } from "@/components/back-button";
import { PageTitle } from "@/components/page-title";
import { CategoryForm } from "@/components/categories/category-form";
import { cookies } from "next/headers";

// Força renderização dinâmica usando cookies()
export default async function Page() {
    // Uso de cookies() força o Next.js a não pré-renderizar estaticamente
    const cookieStore = await cookies();
    const _ = cookieStore.get('session_token');
    return (
        <div>
            <PageTitle
                title="Nova Categoria"
                leftSide={
                    <BackButton fallbackUrl="/categories" />
                }
            />

            <CategoryForm />
        </div>
    );
}
