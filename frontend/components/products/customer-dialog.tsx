"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { customerService } from "@/services/customer"
import { Customer } from "@/types/sale"
import { UserPlus, Loader2 } from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCustomerCreated: (customer: Customer) => void
}

export function CustomerQuickCreateDialog({ open, onOpenChange, onCustomerCreated }: Props) {
  const [name, setName] = useState("")
  const [cpfCnpj, setCpfCnpj] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Nome é obrigatório")
      return
    }

    setSaving(true)
    setError("")

    const payload: Record<string, string> = { name: name.trim() }
    if (cpfCnpj.trim()) payload.cpfCnpj = cpfCnpj.trim()
    if (email.trim()) payload.email = email.trim()
    if (phone.trim()) payload.phone = phone.trim()

    const result = await customerService.createCustomer(payload)

    if (result.error) {
      setError(result.error)
      setSaving(false)
    } else if (result.data) {
      onCustomerCreated(result.data)
      setName("")
      setCpfCnpj("")
      setEmail("")
      setPhone("")
      setError("")
      setSaving(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Novo Cliente
          </DialogTitle>
          <DialogDescription>
            Cadastro rápido para associar à venda atual.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do cliente"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF/CNPJ</Label>
            <Input
              id="cpf"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Salvar e Selecionar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
