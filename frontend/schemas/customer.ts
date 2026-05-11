import { z } from 'zod'

/**
 * Schema de validação de cliente (frontend).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VALIDAÇÃO DE CPF/CNPJ
 * ═══════════════════════════════════════════════════════════════════════════
 * - Se o campo for preenchido, validamos o formato (11 dígitos CPF ou 14 CNPJ)
 * - Strings vazias são convertidas para undefined (não enviadas ao backend)
 * - O backend também normaliza: "" → None via @field_validator
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const customerSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    cpfCnpj: z.string()
        .transform(val => val?.trim() || undefined)
        .pipe(
            z.string()
                .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$|^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, "CPF/CNPJ inválido")
                .optional()
        )
        .optional(),
    email: z.string().email("Email inválido").optional().or(z.literal('')),
    phone: z.string().optional(),
    points: z.coerce.number().min(0, "Pontos devem ser maior ou igual a 0").default(0),
})

/**
 * Schema para cadastro rápido no PDV (sem validação pesada de CPF).
 * Apenas garante que string vazia não seja enviada.
 */
export const customerQuickSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    cpfCnpj: z.string()
        .transform(val => val?.trim() || undefined)
        .optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
})