'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAction } from '@/actions/auth';

const initialState = {
    error: ''
};

export default function LoginPage() {
    // Integração direta com a Server Action corrigida
    const [state, action, isPending] = useActionState(loginAction, initialState);

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/50">
            <div className="w-full max-w-sm p-6 bg-background rounded-lg border shadow-sm">
                <h1 className="text-2xl font-bold mb-6 text-center">Eletrosil Login</h1>
                
                {/* O atributo action chama a função do servidor diretamente */}
                <form action={action} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                            id="email" 
                            name="email" 
                            type="email" 
                            placeholder="Digite seu e-mail"
                            required 
                            autoComplete="off"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input 
                            id="password" 
                            name="password" 
                            type="password" 
                            required 
                            autoComplete="current-password"
                        />
                    </div>

                    {/* Exibe o erro retornado pela loginAction */}
                    {state?.error && (
                        <p className="text-sm text-red-500 text-center font-medium">
                            {state.error}
                        </p>
                    )}

                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? 'Entrando...' : 'Entrar'}
                    </Button>
                </form>
            </div>
        </div>
    );
}