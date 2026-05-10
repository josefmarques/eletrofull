"use client"

import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"

/**
 * Avatar com a inicial correta baseada no user.name.
 * Badge de role com cor correspondente.
 * Consome o usuário do AuthContext para garantir sincronia SSR → Client.
 */
export function UserProfile() {
  const { user, logout } = useAuth()

  // Define a cor do badge baseada na role
  const roleConfig = {
    admin: {
      label: "Admin Global",
      bg: "bg-green-50 dark:bg-green-900/20",
      text: "text-green-700 dark:text-green-400",
      ring: "ring-green-600/20 dark:ring-green-800/30",
    },
    manager: {
      label: "Gerente de Loja",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-700 dark:text-blue-400",
      ring: "ring-blue-700/10 dark:ring-blue-800/30",
    },
    operator: {
      label: "Operador de Caixa",
      bg: "bg-gray-50 dark:bg-gray-900/20",
      text: "text-gray-700 dark:text-gray-400",
      ring: "ring-gray-600/20 dark:ring-gray-800/30",
    },
  }

  const roleStyles = roleConfig[user.role] || roleConfig.operator

  return (
    <div className="flex items-center gap-3">
      {/* ── Avatar com inicial dinâmica ── */}
      <Avatar className="size-9 ring-2 ring-border">
        {user.avatar ? (
          <AvatarImage src={user.avatar} alt={user.name} />
        ) : null}
        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>

      {/* ── Info + Badge ── */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium truncate leading-none">{user.name}</p>
        <p className="text-xs text-muted-foreground truncate leading-none pb-0.5">
          {user.email}
        </p>
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
            roleStyles.bg,
            roleStyles.text,
            roleStyles.ring
          )}
        >
          {roleStyles.label}
        </span>
      </div>

      {/* ── Ações ── */}
      <div className="flex flex-col gap-1.5 shrink-0">
        <ThemeToggle />
        <Button
          onClick={logout}
          size="icon"
          variant="outline"
          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
