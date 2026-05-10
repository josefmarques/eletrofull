'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerApi } from '@/lib/server-api';

/**
 * Server Action para autenticação de usuários.
 * Como roda no servidor, utiliza o getServerApi para falar diretamente 
 * com o container backend na porta 3001.
 */
export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // Variável para controle de sucesso do redirecionamento
  let isSuccessful = false;

  try {
    // 1. Instancia o Axios configurado para o ambiente de servidor (Docker Internal)
    const api = await getServerApi();
    
    // 2. Realiza o POST para o backend
    // A baseURL já é http://backend:3001 conforme definido no lib/server-api.ts
    const response = await api.post('/auth/login', { email, password });
    
    // O Axios já faz o parse do JSON automaticamente
    const result = response.data;
    const token = result.data?.token;

    if (!token) {
      return { error: 'Falha na comunicação: Token não recebido do servidor.' };
    }

    // 3. Configura o cookie de sessão
    const cookieStore = await cookies();
    cookieStore.set('session_token', token, {
      httpOnly: false, // Mantido como false para permitir a leitura pelo Nginx se necessário
      secure: false,   // Localhost usa HTTP
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/',
    });

    isSuccessful = true;
  } catch (err: any) {
    // Tratamento de erros do Axios (ex: 401 Unauthorized ou 404 Not Found)
    if (err.response) {
       console.error('[LoginAction] Backend Error:', err.response.data);
       return { 
         error: err.response.data?.error || 'Credenciais inválidas ou erro no servidor.' 
       };
    }
    
    // Erros de rede (ex: backend fora do ar)
    console.error('[LoginAction] Connection Error:', err.message);
    return { error: 'Não foi possível conectar ao servidor de autenticação.' };
  }

  // 4. O redirect DEVE ser chamado fora do bloco try/catch.
  // O Next.js lança uma exceção interna no redirect que não deve ser capturada pelo catch.
  if (isSuccessful) {
    redirect('/dashboard');
  }
}

/**
 * Server Action para encerrar a sessão.
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('session_token');
  redirect('/login');
}