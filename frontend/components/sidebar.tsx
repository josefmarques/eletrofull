"use client";

import { CalendarSearch, Inbox, LayoutDashboard, Search, User as UserIcon, Receipt, DollarSign, Shield, Store, Building2, LogOut, Users, FileText, Landmark } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Logo } from "./logo"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/contexts/AuthContext"
import Link from "next/link"
import { Branch } from "@/types/branch"
import { usePathname, useSearchParams } from "next/navigation"

type Props = {
  branches?: Branch[]
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "operator", "vendedor"] },
  { group: "Gestão" },
  { href: "/categories", label: "Categorias", icon: Search, roles: ["admin", "manager", "vendedor"] },
  { href: "/customers", label: "Clientes", icon: Users, roles: ["admin", "manager", "vendedor"] },
  { href: "/branches", label: "Unidades", icon: Building2, roles: ["admin"] },
  { href: "/users", label: "Usuários", icon: UserIcon, roles: ["admin"] },
  { href: "/audit", label: "Auditoria", icon: Shield, roles: ["admin"] },
  { group: "Estoque" },
  { href: "/products", label: "Produtos", icon: Inbox, roles: ["admin", "manager", "operator", "vendedor"] },
  { href: "/moves", label: "Entrada/Saída", icon: CalendarSearch, roles: ["admin", "manager", "operator", "vendedor"] },
  { group: "Vendas" },
  { href: "/cashier", label: "Caixa", icon: DollarSign, roles: ["admin", "manager", "operator", "vendedor"] },
  { href: "/pdv", label: "PDV", icon: CalendarSearch, roles: ["admin", "manager", "operator", "vendedor"] },
  { href: "/quotes", label: "Orçamentos", icon: FileText, roles: ["admin", "manager", "vendedor"] },
  { href: "/sales", label: "Histórico", icon: Receipt, roles: ["admin", "manager", "operator", "vendedor"] },
  { group: "Financeiro" },
  { href: "/finance", label: "Fluxo de Caixa", icon: Landmark, roles: ["admin", "manager"] },
]

export function AppSidebar({ branches = [] }: Props) {
  const { user } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlBranchId = searchParams.get("branch")
  const queryParams = urlBranchId ? `?branch=${urlBranchId}` : ""

  // ── Resolve o nome da filial do usuário ──
  const userBranchName = user ? branches.find(
    (b: Branch) => String(b.id) === String(user.branchId)
  )?.name : undefined

  const isActive = (href: string) =>
    href === "/sales" || href === "/finance" ? pathname.startsWith(href) : pathname === href

  // ── Segurança: se não há usuário, não renderiza nada ──
  if (!user) return null

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="text-center py-4">
        <Logo />
      </SidebarHeader>

      {/* ── Indicador Global de Filial ── */}
      <div className="px-4 pb-2 pt-0">
        {user?.role === "admin" ? (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border border-violet-200/50 dark:border-violet-800/30">
            <span className="text-base">🌐</span>
            <span className="text-xs font-semibold text-violet-700 dark:text-violet-300 tracking-tight">
              Toda a Rede
            </span>
          </div>
        ) : userBranchName ? (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/30">
            <Store className="size-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 tracking-tight truncate">
              {userBranchName}
            </span>
          </div>
        ) : null}
      </div>

      <SidebarContent>
        {(() => {
          const items: React.ReactNode[] = []
          let currentGroup: React.ReactNode[] = []

          const flushGroup = () => {
            if (currentGroup.length > 0) {
              items.push(
                <SidebarGroup key={`group-${items.length}`}>
                  <SidebarGroupContent>
                    <SidebarMenu>{currentGroup}</SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )
              currentGroup = []
            }
          }

          navItems.forEach((item: any) => {
            if (item.group) {
              flushGroup()
              items.push(
                <SidebarGroup key={item.group}>
                  <SidebarGroupLabel>{item.group}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {/* Group label placeholder */}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )
            } else if (!item.roles || item.roles.includes(user?.role)) {
              currentGroup.push(
                <SidebarMenuItem key={item.href}>
                  <Link href={`${item.href}${queryParams}`}>
                    <SidebarMenuButton isActive={isActive(item.href)}>
                      <item.icon className="!size-4.5" /> <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              )
            }
          })
          flushGroup()
          return items
        })()}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3">
          {/* ── Avatar com inicial DINÂMICA baseada no user.name ── */}
          <Avatar className="size-9 ring-2 ring-border">
            {user.avatar ? (
              <AvatarImage src={user.avatar} alt={user.name} />
            ) : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          {/* ── Info do usuário ── */}
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-medium truncate leading-none">
              {user.name}
            </p>
            <p className="text-xs text-muted-foreground truncate leading-none pb-0.5">
              {user.email}
            </p>
          </div>

          {/* ── Ações ── */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <ThemeToggle />
            <Button
              onClick={() => {
                document.cookie = "session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
                window.location.href = "/login";
              }}
              size="icon"
              variant="outline"
              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
