'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getServerApi } from '@/lib/server-api'
import { getFieldErrors } from '@/lib/utils'
import { stockSchema } from '@/schemas/stock'

export async function upsertStockAction(prevState: any, formData: FormData) {
    const id = formData.get('id') as string | null

    const rawData = {
        branchId: formData.get('branchId'),
        productId: formData.get('productId'),
        quantity: formData.get('quantity'),
        minimumQuantity: formData.get('minimumQuantity'),
        maximumQuantity: formData.get('maximumQuantity'),
    }

    // Validate data
    const validation = stockSchema.safeParse(rawData)

    if (!validation.success) {
        return {
            error: "Erro de validação",
            fieldErrors: getFieldErrors(validation.error)
        }
    }

    const api = await getServerApi()

    try {
        let response;
        if (id) {
            // Update
            response = await api.put(`/stocks/${id}`, validation.data)
        } else {
            // Create
            response = await api.post('/stocks', validation.data)
        }

        if (response.data.error) {
            return { error: response.data.error }
        }

    } catch (error: any) {
        return { error: error.response?.data?.error || 'Erro ao salvar estoque' }
    }

    revalidatePath('/stock')
    redirect('/stock')
}

export async function deleteStockAction(id: string) {
    const api = await getServerApi()
    try {
        const response = await api.delete(`/stocks/${id}`)

        if (response.status !== 204 && response.data?.error) {
            return { error: response.data.error }
        }

        revalidatePath('/stock')
        return { error: null }
    } catch (error: any) {
        return { error: error.response?.data?.error || 'Erro ao deletar estoque' }
    }
}