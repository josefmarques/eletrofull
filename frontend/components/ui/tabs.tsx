"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// ─── Context ─────────────────────────────────────────────────────────────────

type TabsContextValue = {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>")
  return ctx
}

// ─── Slot (asChild helper) ───────────────────────────────────────────────────

function Slot({
  children,
  ...props
}: {
  children: React.ReactNode
  [key: string]: any
}) {
  const child = React.Children.only(children) as React.ReactElement<any>

  return React.cloneElement(child, {
    ...props,
    ...child.props,
    className: cn(props.className, child.props.className),
    // Merge event handlers
    onClick: (e: React.MouseEvent) => {
      child.props.onClick?.(e)
      props.onClick?.(e)
    },
  })
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

type TabsProps = {
  value: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
  defaultValue?: string
}

export function Tabs({ value, onValueChange, children, className, defaultValue }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || value)

  const ctxValue = React.useMemo(
    () => ({
      value: onValueChange !== undefined ? value : internalValue,
      onValueChange: onValueChange || setInternalValue,
    }),
    [value, onValueChange, internalValue]
  )

  return (
    <TabsContext.Provider value={ctxValue}>
      <div className={cn("w-full", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

// ─── TabsList ────────────────────────────────────────────────────────────────

type TabsListProps = {
  children: React.ReactNode
  className?: string
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
        className
      )}
    >
      {children}
    </div>
  )
}

// ─── TabsTrigger ─────────────────────────────────────────────────────────────

type TabsTriggerProps = {
  value: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
  asChild?: boolean
}

export function TabsTrigger({
  value,
  children,
  className,
  disabled,
  asChild = false,
}: TabsTriggerProps) {
  const { value: currentValue, onValueChange } = useTabsContext()
  const isActive = currentValue === value

  // Props que o botão teria
  const buttonProps = {
    role: "tab" as const,
    "aria-selected": isActive,
    disabled,
    onClick: () => onValueChange(value),
    className: cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      isActive
        ? "bg-background text-foreground shadow-sm"
        : "hover:bg-background/50 hover:text-foreground",
      className
    ),
  }

  if (asChild) {
    // Renderiza o filho (ex: <Link>) com os props mesclados — sem <button>
    return <Slot {...buttonProps}>{children}</Slot>
  }

  return <button type="button" {...buttonProps}>{children}</button>
}

// ─── TabsContent ─────────────────────────────────────────────────────────────

type TabsContentProps = {
  value: string
  children: React.ReactNode
  className?: string
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: currentValue } = useTabsContext()

  if (currentValue !== value) return null

  return (
    <div
      role="tabpanel"
      className={cn("mt-4 ring-offset-background focus-visible:outline-none", className)}
    >
      {children}
    </div>
  )
}
