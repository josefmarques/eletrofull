import { z } from 'zod'

export const userSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().optional(),
    role: z.enum(["admin", "manager", "operator"], {
        errorMap: () => ({ message: "Perfil de acesso inválido" }),
    }),
    branchId: z.string().optional(),
})
