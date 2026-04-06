'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthUser } from '@/types/poa';
import { login as apiLogin, getMe } from '@/lib/poa-api';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  isRole: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('poa_token');
    if (token) {
      getMe()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('poa_token');
          localStorage.removeItem('poa_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    localStorage.setItem('poa_token', result.access_token);
    localStorage.setItem('poa_user', JSON.stringify(result.user));
    setUser(result.user);
  };

  const logout = () => {
    localStorage.removeItem('poa_token');
    localStorage.removeItem('poa_user');
    setUser(null);
    window.location.href = '/admin/login';
  };

  const isRole = (...roles: string[]) => {
    return user ? roles.includes(user.rol) : false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
