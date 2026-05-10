import { z } from 'zod';

export const productSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    categoryId: z.string().min(1, "Selecione uma categoria"),
    unitPrice: z.coerce.number().min(0, "Preço deve ser maior ou igual a 0"),
    unitType: z.enum(["un", "cx", "rl", "m", "pc", "kg", "lt", "par", "cj"] as const),
    quantity: z.coerce.number().min(0, "Quantidade deve ser maior ou igual a 0"),
    minimumQuantity: z.coerce.number().min(0, "Quantidade deve ser maior ou igual a 0"),
    maximumQuantity: z.coerce.number().min(0, "Quantidade deve ser maior ou igual a 0"),
});
