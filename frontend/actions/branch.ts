'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getServerApi } from '@/lib/server-api'
import { getFieldErrors } from '@/lib/utils'
import { branchSchema } from '@/schemas/branch'

export async function upsertBranchAction(prevState: any, formData: FormData) {
    const id = formData.get('id') as string | null

    const rawData = {
        name: formData.get('name'),
        address: formData.get('address'),
    }

    // Validate data
    const validation = branchSchema.safeParse(rawData)

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
            response = await api.put(`/branches/${id}`, validation.data)
        } else {
            // Create
            response = await api.post('/branches', validation.data)
        }

        if (response.data.error) {
            return { error: response.data.error }
        }

    } catch (error: any) {
        return { error: error.response?.data?.error || 'Erro ao salvar unidade' }
    }

    revalidatePath('/branches')
    redirect('/branches')
}

export async function deleteBranchAction(id: string) {
    const api = await getServerApi()
    try {
        const response = await api.delete(`/branches/${id}`)

        if (response.status !== 204 && response.data?.error) {
            return { error: response.data.error }
        }

        revalidatePath('/branches')
        return { error: null }
    } catch (error: any) {
        return { error: error.response?.data?.error || 'Erro ao deletar unidade' }
    }
}