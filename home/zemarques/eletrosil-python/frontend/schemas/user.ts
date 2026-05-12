import { z } from 'zod'

export const userSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().optional(),
    role: z.enum(["admin", "manager", "operator", "vendedor"], {
        errorMap: () => ({ message: "Perfil de acesso inválido" }),
    }),
    branchId: z.string().optional(),
    commissionRate: z.coerce.number().min(0, "Comissão deve ser >= 0").max(100, "Comissão deve ser <= 100").default(0),
})
