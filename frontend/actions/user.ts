'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getServerApi } from '@/lib/server-api'
import { getFieldErrors } from '@/lib/utils'
import { userSchema } from '@/schemas/user'

export async function upsertUserAction(prevState: any, formData: FormData) {
    const id = formData.get('id') as string | null
    const password = formData.get('password') as string

    // Custom validation for password
    if (!id && (!password || password.length < 6)) {
        return {
            error: "Senha é obrigatória e deve ter pelo menos 6 caracteres",
            fieldErrors: { password: ["Senha inválida"] }
        }
    }
    if (id && password && password.length < 6) {
        return {
            error: "Senha deve ter pelo menos 6 caracteres",
            fieldErrors: { password: ["Senha muito curta"] }
        }
    }

    const rawRole = formData.get('role') as string || 'operator'
    const rawBranchId = formData.get('branchId') as string || ''

    const rawCommissionRate = formData.get('commissionRate') as string
    
    const rawData = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: rawRole,
        // Admin Global não tem filial — força null
        branchId: rawRole === 'admin' ? '' : rawBranchId,
        commissionRate: rawCommissionRate ? Number(rawCommissionRate) : undefined,
    }

    // Validate fields
    const validation = userSchema.safeParse(rawData)

    if (!validation.success) {
        return {
            error: "Erro de validação",
            fieldErrors: getFieldErrors(validation.error)
        }
    }

    const api = await getServerApi()

    try {
        let response;
        if (!id) {
            // Create user (JSON)
            const payload: Record<string, any> = {
                name: rawData.name,
                email: rawData.email,
                password: rawData.password,
                role: rawData.role,
            }
            // Só envia branchId se não for admin
            if (rawData.role !== 'admin' && rawData.branchId) {
                payload.branchId = rawData.branchId
            }
            // Envia commissionRate se for vendedor
            if (rawData.role === 'vendedor' && rawData.commissionRate !== undefined) {
                payload.commissionRate = rawData.commissionRate
            }
            response = await api.post('/users', payload)
        } else {
            // UPDATE:
            const payload = new FormData()
            payload.append('name', rawData.name as string)
            payload.append('email', rawData.email as string)
            if (password) payload.append('password', password)
            payload.append('role', rawData.role as string)
            // Admin não tem filial; não-admin pode ter filial vazia (sem lotação ainda)
            payload.append('branchId', rawData.branchId)
            
            if (rawData.commissionRate !== undefined) {
                payload.append('commissionRate', String(rawData.commissionRate))
            }

            const avatar = formData.get('avatar') as File
            if (avatar && avatar.size > 0) {
                payload.append('avatar', avatar)
            }

            response = await api.put(`/users/${id}`, payload, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
        }

        if (response.data.error) {
            return { error: response.data.error }
        }

    } catch (error: any) {
        // FastAPI retorna { "detail": "mensagem" }, não { "error": "mensagem" }
        const msg = error.response?.data?.detail 
                  || error.response?.data?.error 
                  || 'Erro ao salvar usuário'
        return { error: msg }
    }

    revalidatePath('/users')
    redirect('/users')
}

export async function toggleUserStatusAction(userId: string) {
    const api = await getServerApi()
    try {
        const response = await api.patch(`/users/${userId}/status`)

        if (response.data?.error) {
            return { error: response.data.error, data: null }
        }

        revalidatePath('/users')
        return { error: null, data: response.data?.data || null }
    } catch (error: any) {
        const msg = error.response?.data?.detail 
                  || error.response?.data?.error 
                  || 'Erro ao alternar status do usuário'
        return { error: msg, data: null }
    }
}


// Mantido para retrocompatibilidade (DELETE agora é chamado pelo toggle)
export async function deleteUserAction(id: string) {
    return toggleUserStatusAction(id)
}
