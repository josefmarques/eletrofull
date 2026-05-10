'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getServerApi } from '@/lib/server-api'
import { getFieldErrors } from '@/lib/utils'
import { saleItemSchema } from '@/schemas/saleItem'

export async function createSaleItemAction(prevState: any, formData: FormData) {
    const rawData = {
        saleId: formData.get('saleId'),
        productId: formData.get('productId'),
        quantity: formData.get('quantity'),
        unitPrice: formData.get('unitPrice'),
    }

    // Validate data
    const validation = saleItemSchema.safeParse(rawData)

    if (!validation.success) {
        return {
            error: "Erro de validação",
            fieldErrors: getFieldErrors(validation.error)
        }
    }

    const api = await getServerApi()

    try {
        const response = await api.post('/sale-items', validation.data)

        if (response.data.error) {
            return { error: response.data.error }
        }

        revalidatePath('/sales')
        return { error: null }

    } catch (error: any) {
        return { error: error.response?.data?.error || 'Erro ao criar item de venda' }
    }
}

export async function updateSaleItemAction(id: string, prevState: any, formData: FormData) {
    const rawData = {
        saleId: formData.get('saleId'),
        productId: formData.get('productId'),
        quantity: formData.get('quantity'),
        unitPrice: formData.get('unitPrice'),
    }

    // Validate data
    const validation = saleItemSchema.safeParse(rawData)

    if (!validation.success) {
        return {
            error: "Erro de validação",
            fieldErrors: getFieldErrors(validation.error)
        }
    }

    const api = await getServerApi()

    try {
        const response = await api.put(`/sale-items/${id}`, validation.data)

        if (response.data.error) {
            return { error: response.data.error }
        }

        revalidatePath('/sales')
        return { error: null }

    } catch (error: any) {
        return { error: error.response?.data?.error || 'Erro ao atualizar item de venda' }
    }
}

export async function deleteSaleItemAction(id: string) {
    const api = await getServerApi()
    try {
        const response = await api.delete(`/sale-items/${id}`)

        if (response.status !== 204 && response.data?.error) {
            return { error: response.data.error }
        }

        revalidatePath('/sales')
        return { error: null }
    } catch (error: any) {
        return { error: error.response?.data?.error || 'Erro ao deletar item de venda' }
    }
}