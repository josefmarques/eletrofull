import { cookies } from 'next/headers'
import axios from 'axios'

export async function getServerApi() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session_token')?.value

  // No ambiente Docker (Server-to-Server), chamamos o container 'backend' na porta 3001.
  // IMPORTANTE: Aqui NÃO usamos o prefixo /api, pois a comunicação é direta e pula o Nginx.
  const baseURL = process.env.INTERNAL_API_URL || 'http://backend:3001';

  const api = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    withCredentials: true,
  })

  api.interceptors.request.use(request => {
    // Log para conferir se a URL interna está correta (deve ser http://backend:3001/rota)
    console.log('[Server Axios Request] URL:', (request.baseURL || '') + (request.url || ''))
    return request
  })

  return api
}