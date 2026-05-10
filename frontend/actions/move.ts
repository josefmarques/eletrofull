'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getFieldErrors } from '@/lib/utils'
import { moveSchema } from '@/schemas/move'
import { moveService } from '@/services/move'

export async function createMoveAction(prevState: any, formData: FormData) {
  // 1. Capturamos também o branchId, que é essencial na sua arquitetura multi-filial
  const rawData = {
    productId: formData.get('productId'),
    branchId: formData.get('branchId'), // Unidade de Operação selecionada no formulário
    type: formData.get('type'),
    quantity: formData.get('quantity'),

    
  }
  

  // Validação dos dados com o Zod
  const validation = moveSchema.safeParse(rawData)

  if (!validation.success) {
    return {
      error: "Erro de validação",
      fieldErrors: getFieldErrors(validation.error)
    }
  }

  // 2. Variável de controle para o redirect (evita bugs de exceção dentro do try/catch)
  let success = false;

  try {
    const { productId, branchId, type, quantity } = validation.data

    // 3. Chamada ao serviço garantindo o envio da filial
    const response = await moveService.createMove({
      productId,
      branchId,
      type,
      quantity,
    });

    if (response.error) {
      return { error: response.error }
    }

    success = true;
  } catch (err: any) {
    console.error('[createMoveAction] Error:', err.message);
    return { error: 'Erro ao processar movimentação no servidor.' }
  }
  // 4. Revalidação e Redirecionamento (fora do try/catch)
  if (success) {
    // Força o Next.js a limpar o cache nas rotas de layout afetadas
    revalidatePath('/(painel)/products', 'layout');
    revalidatePath('/(painel)/moves', 'layout');
    revalidatePath('/(painel)/dashboard', 'layout');
    
    // Redireciona para a listagem atualizada
    redirect('/moves');
  }
}