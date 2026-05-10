import { BackButton } from "@/components/back-button";
import { PageTitle } from "@/components/page-title";
import { MoveForm } from "@/components/moves/move-form";
import { authService } from "@/services/auth";
import { getServerApi } from "@/lib/server-api";
import { redirect } from "next/navigation";

// Força renderização dinâmica pois usamos cookies() para autenticação
export const dynamic = 'force-dynamic';

export default async function Page() {
    // 1. Buscamos os dados do usuário logado para identificar sua filial padrão
    const { data: user } = await authService.getMe();

    // Se o token expirou ou o usuário não foi encontrado, redirecionamos para o login
    if (!user) {
        redirect("/login");
    }

    // 2. Se o usuário for Admin, buscamos a lista de filiais para o Select do formulário
    let branches = [];
    if (user.isAdmin) {
        try {
            const api = await getServerApi();
            const res = await api.get('/branches');
            branches = res.data.data;
        } catch (error) {
            console.error("Erro ao carregar filiais para o cadastro de movimentação:", error);
        }
    }

    return (
        <div className="space-y-6">
            <PageTitle
                title="Nova Movimentação"
                leftSide={
                    <BackButton fallbackUrl="/moves" />
                }
            />

            <div className="bg-background border rounded-xl shadow-sm overflow-hidden">
                {/* Passamos o usuário e as filiais para o formulário gerenciar a lógica de permissões */}
                <MoveForm user={user} branches={branches} />
            </div>
        </div>
    );
}