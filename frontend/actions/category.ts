'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getServerApi } from '@/lib/server-api'
import { getFieldErrors } from '@/lib/utils'
import { categorySchema } from '@/schemas/category'

export async function upsertCategoryAction(prevState: any, formData: FormData) {
  const id = formData.get('id') as string | null
  const name = formData.get('name') as string

  // Validate data
  const validation = categorySchema.safeParse({ name })
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
      response = await api.put(`/categories/${id}`, { name })
    } else {
      // Create
      response = await api.post('/categories', { name })
    }

    if (response.data.error) {
      return { error: response.data.error }
    }

  } catch (error: any) {
    return { error: error.response?.data?.error || 'Erro ao salvar categoria' }
  }

  revalidatePath('/categories')
  redirect('/categories')
}

export async function deleteCategoryAction(id: string) {
  const api = await getServerApi()
  try {
    const response = await api.delete(`/categories/${id}`)

    if (response.status !== 204 && response.data?.error) {
      return { error: response.data.error }
    }

    revalidatePath('/categories')
    return { error: null }
  } catch (error: any) {
    return { error: error.response?.data?.error || 'Erro ao deletar categoria' }
  }
}
