import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  const { pathname } = request.nextUrl

  // DEBUG no terminal do Docker
  console.log(`[Proxy] Path: ${pathname} | Token: ${token ? 'Presente' : 'Ausente'} | Method: ${request.method}`);

  // If it's a POST to /login, let it pass through
  if (pathname === '/login' && request.method === 'POST') {
    console.log('[Proxy] Allowing POST to /login');
    return NextResponse.next();
  }

  // 1. NÃO redirecione automaticamente de /login para /dashboard
  // Deixe o usuário clicar no botão ou ser redirecionado via JavaScript
  // Isso evita loops infinitos

  // 2. Proteção de rotas privadas - apenas redirecione se NÃO tiver token
  const isPrivatePage = pathname.startsWith('/dashboard') || 
                        pathname.startsWith('/pdv') || 
                        pathname.startsWith('/products') ||
                        pathname.startsWith('/finance') ||
                        pathname.startsWith('/sales')

  if (!token && isPrivatePage) {
    console.log('[Proxy] No token, redirecting to /login');
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. Se tiver token e estiver em /login, apenas deixe passar (não redirecione)
  if (pathname === '/login' && token) {
    console.log('[Proxy] On /login with token, allowing access (no redirect)');
    return NextResponse.next();
  }

  // 4. Para todas as outras situações, use .next()
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/pdv/:path*', '/products/:path*', '/finance/:path*', '/sales/:path*', '/login'],
}
