import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('[API Login] Attempt:', { email });

    const api = axios.create({
      baseURL: process.env.INTERNAL_API_URL || 'http://backend:3001',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await api.post('/auth/login', { email, password });
    
    console.log('[API Login] Response:', { status: response.status, data: response.data });
    
    if (response.data.data?.token) {
      const token = response.data.data.token;
      const res = NextResponse.json(response.data);
      
      // Define o cookie de sessão
      res.cookies.set('session_token', token, {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      
      console.log('[API Login] Cookie set successfully');
      return res;
    }
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('[API Login] Error:', error.message);
    return NextResponse.json(
      { error: error.response?.data?.error || 'Login failed' },
      { status: error.response?.status || 500 }
    );
  }
}
