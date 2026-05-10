"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types/user";

type AuthState = {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

type Props = {
  initialUser: User | null;
  children: ReactNode;
};

export function AuthProvider({ initialUser, children }: Props) {
  // Estado único do usuário, iniciado com o valor do SSR
  const [user, setUser] = useState<User | null>(initialUser);
  const router = useRouter();

  const logout = useCallback(() => {
    // 1. Limpa o cookie de sessão no client-side
    document.cookie = "session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
    // 2. Zera o estado do usuário
    setUser(null);
    // 3. Redireciona para o login
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
