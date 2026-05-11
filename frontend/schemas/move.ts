import { z } from 'zod';

export const moveSchema = z.object({
    productId: z.uuid("Produto inválido"),
    branchId: z.string().uuid(),
    type: z.enum(['in', 'out'] as const),
    quantity: z.coerce.number().min(0.01, "Quantidade deve ser maior que 0"),
    description: z.string().optional(),
});
