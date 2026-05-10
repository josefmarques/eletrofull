import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { authService } from "@/services/auth";
import { branchService } from "@/services/branch";
import { SaleProvider } from "@/contexts/SaleContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { Suspense } from "react";

export const dynamic = 'force-dynamic';

export default async function PainelLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // ── 1. Busca o usuário autenticado ──
    const response = await authService.getMe().catch(() => ({ data: null }));
    const user = response?.data || null;

    // ── 2. Redireciona para login se não autenticado ──
    if (!user) {
        redirect('/login');
    }

    // ── 3. Só busca filiais se o usuário existe (evita 401 desnecessário) ──
    const branchesRes = await branchService.getBranches().catch(() => ({ data: [] }));
    const branches = branchesRes?.data || [];

    return (
        <AuthProvider initialUser={user}>
        <SaleProvider>
            <ToastProvider>
                <SidebarProvider>
                    <Suspense fallback={<div className="w-64 border-r bg-background" />}>
                        <AppSidebar 
                            key={user?.id || 'anonymous'} 
                            branches={branches}
                        />
                    </Suspense>
                    <div className="flex-1 relative p-4 pt-10">
                        <div className="absolute left-1 top-1">
                            <SidebarTrigger />
                        </div>
                        {children}
                    </div>
                </SidebarProvider>
            </ToastProvider>
        </SaleProvider>
        </AuthProvider>
    );
}
