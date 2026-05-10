"use client"

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react"
import { XIcon, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Toast {
  id: string
  title: string
  description?: string
  type?: "success" | "error"
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, "id">) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { ...toast, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4 shadow-lg animate-in slide-in-from-right-full min-w-[300px] max-w-[420px]",
              toast.type === "error"
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-green-200 bg-green-50 text-green-900"
            )}
          >
            {toast.type === "error" ? (
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
            ) : (
              <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-sm">{toast.title}</p>
              {toast.description && (
                <p className="text-xs opacity-80 mt-0.5">{toast.description}</p>
              )}
            </div>
            <button onClick={() => removeToast(toast.id)} className="shrink-0 opacity-60 hover:opacity-100">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error("useToast must be used within ToastProvider")
  return context
}
