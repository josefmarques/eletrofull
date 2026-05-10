import { z } from 'zod'

export const saleItemSchema = z.object({
    saleId: z.string().uuid("Venda inválida"),
    productId: z.string().uuid("Produto inválido"),
    quantity: z.coerce.number().min(1, "Quantidade deve ser maior que 0"),
    unitPrice: z.coerce.number().min(0, "Preço unitário deve ser maior ou igual a 0"),
})