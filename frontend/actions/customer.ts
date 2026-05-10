'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getServerApi } from '@/lib/server-api'
import { getFieldErrors } from '@/lib/utils'
import { customerSchema } from '@/schemas/customer'

export async function upsertCustomerAction(prevState: any, formData: FormData) {
    const id = formData.get('id') as string | null

    const rawData = {
        name: formData.get('name'),
        cpfCnpj: formData.get('cpfCnpj'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        points: formData.get('points'),
    }

    // Validate data
    const validation = customerSchema.safeParse(rawData)

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
            response = await api.put(`/customers/${id}`, validation.data)
        } else {
            // Create
            response = await api.post('/customers', validation.data)
        }

        if (response.data.error) {
            return { error: response.data.error }
        }

    } catch (error: any) {
        return { error: error.response?.data?.error || 'Erro ao salvar cliente' }
    }

    revalidatePath('/customers')
    redirect('/customers')
}

export async function deleteCustomerAction(id: string) {
    const api = await getServerApi()
    try {
        const response = await api.delete(`/customers/${id}`)

        if (response.status !== 204 && response.data?.error) {
            return { error: response.data.error }
        }

        revalidatePath('/customers')
        return { error: null }
    } catch (error: any) {
        return { error: error.response?.data?.error || 'Erro ao deletar cliente' }
    }
}