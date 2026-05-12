import { z } from 'zod'

export const saleSchema = z.object({
    branchId: z.string().uuid("Filial inválida"),
    customerId: z.string().uuid().optional(),
    sellerId: z.string().uuid().optional(),
    totalValue: z.coerce.number().min(0, "Valor total deve ser maior ou igual a 0"),
    discount: z.coerce.number().min(0, "Desconto deve ser maior ou igual a 0").default(0),
    paymentStatus: z.enum(['pending', 'paid', 'cancelled'] as const).default('pending'),
    items: z.array(z.object({
        productId: z.string().uuid("Produto inválido"),
        quantity: z.coerce.number().min(1, "Quantidade deve ser maior que 0"),
        unitPrice: z.coerce.number().min(0, "Preço unitário deve ser maior ou igual a 0"),
    })).min(1, "A venda deve ter pelo menos um item")
})
