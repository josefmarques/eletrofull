import { z } from 'zod'

export const branchSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    address: z.string().optional(),
})