'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getServerApi } from '@/lib/server-api'
import { getFieldErrors } from '@/lib/utils'
import { saleSchema } from '@/schemas/sale'

export async function createSaleAction(prevState: any, formData: FormData) {
    // Parse items from formData
    const itemsJson = formData.get('items') as string
    const items = JSON.parse(itemsJson)

    const rawData = {
        branchId: formData.get('branchId'),
        customerId: formData.get('customerId'),
        totalValue: formData.get('totalValue'),
        discount: formData.get('discount'),
        paymentStatus: formData.get('paymentStatus'),
        items: items,
    }

    // Validate data
    const validation = saleSchema.safeParse(rawData)

    if (!validation.success) {
        return {
            error: "Erro de validação",
            fieldErrors: getFieldErrors(validation.error)
        }
    }

    const api = await getServerApi()

    try {
        const response = await api.post('/sales', validation.data)

        if (response.data.error) {
            return { error: response.data.error }
        }

        // Redirect to sales list with success message
        revalidatePath('/sales')
        redirect('/sales')

    } catch (error: any) {
        return { error: error.response?.data?.error || 'Erro ao criar venda' }
    }
}

export async function updateSaleAction(id: string, prevState: any, formData: FormData) {
    // Parse items from formData
    const itemsJson = formData.get('items') as string
    const items = JSON.parse(itemsJson)

    const rawData = {
        branchId: formData.get('branchId'),
        customerId: formData.get('customerId'),
        totalValue: formData.get('totalValue'),
        discount: formData.get('discount'),
        paymentStatus: formData.get('paymentStatus'),
        items: items,
    }

    // Validate data
    const validation = saleSchema.safeParse(rawData)

    if (!validation.success) {
        return {
            error: "Erro de validação",
            fieldErrors: getFieldErrors(validation.error)
        }
    }

    const api = await getServerApi()

    try {
        const response = await api.put(`/sales/${id}`, validation.data)

        if (response.data.error) {
            return { error: response.data.error }
        }

        revalidatePath('/sales')
        redirect('/sales')

    } catch (error: any) {
        return { error: error.response?.data?.error || 'Erro ao atualizar venda' }
    }
}

export async function deleteSaleAction(id: string) {
    const api = await getServerApi()
    try {
        const response = await api.delete(`/sales/${id}`)

        if (response.status !== 204 && response.data?.error) {
            return { error: response.data.error }
        }

        revalidatePath('/sales')
        return { error: null }
    } catch (error: any) {
        return { error: error.response?.data?.error || 'Erro ao deletar venda' }
    }
}