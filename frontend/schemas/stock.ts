import { z } from 'zod'

export const stockSchema = z.object({
    branchId: z.string().uuid("Unidade inválida"),
    productId: z.string().uuid("Produto inválido"),
    quantity: z.coerce.number().min(0, "Quantidade deve ser maior ou igual a 0"),
    minimumQuantity: z.coerce.number().min(0, "Quantidade mínima deve ser maior ou igual a 0").default(0),
    maximumQuantity: z.coerce.number().min(0, "Quantidade máxima deve ser maior ou igual a 0").default(0),
})