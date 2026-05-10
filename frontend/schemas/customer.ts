import { z } from 'zod'

export const customerSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    cpfCnpj: z.string().optional(),
    email: z.string().email("Email inválido").optional(),
    phone: z.string().optional(),
    points: z.coerce.number().min(0, "Pontos devem ser maior ou igual a 0").default(0),
})