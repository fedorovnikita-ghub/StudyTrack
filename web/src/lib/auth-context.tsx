'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, apiRequest, RequestOptions } from './api';
import { Session, User } from './types';

// Токен живет только в памяти вкладки (по ТЗ). После обновления страницы нужно войти снова
interface AuthContextValue {
  user: User | null;
  notice: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (displayName: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  clearNotice: () => void;
  request: <T>(path: string, options?: Omit<RequestOptions, 'token'>) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const EXPIRED_NOTICE = 'Сессия истекла. Войдите снова';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Ref нужен, чтобы запросы всегда брали актуальный токен
  const tokenRef = useRef<string | null>(null);

  const startSession = useCallback((next: Session) => {
    tokenRef.current = next.token;
    setSession(next);
    setNotice(null);
  }, []);

  const endSession = useCallback((message: string | null) => {
    tokenRef.current = null;
    setSession(null);
    setNotice(message);
  }, []);

  // Завершаем сессию сами, когда истекает срок токена
  useEffect(() => {
    if (!session) return;
    const msLeft = new Date(session.expiresAt).getTime() - Date.now();
    const timer = setTimeout(() => endSession(EXPIRED_NOTICE), Math.max(msLeft, 0));
    return () => clearTimeout(timer);
  }, [session, endSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await apiRequest<Session>('/auth/login', { method: 'POST', body: { email, password } });
      startSession(result);
      return result.user;
    },
    [startSession],
  );

  const register = useCallback(
    async (displayName: string, email: string, password: string) => {
      const result = await apiRequest<Session>('/auth/register', {
        method: 'POST',
        body: { displayName, email, password },
      });
      startSession(result);
      return result.user;
    },
    [startSession],
  );

  const logout = useCallback(() => {
    // Сервер токены не хранит, поэтому ответ не ждем: главное - очистить состояние клиента
    void apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined);
    endSession(null);
  }, [endSession]);

  const clearNotice = useCallback(() => setNotice(null), []);

  const request = useCallback(
    async function <T>(path: string, options: Omit<RequestOptions, 'token'> = {}): Promise<T> {
      try {
        return await apiRequest<T>(path, { ...options, token: tokenRef.current });
      } catch (err) {
        // 401 на защищенном запросе: токен истек или аккаунт отключен
        if (err instanceof ApiError && err.status === 401 && tokenRef.current) {
          endSession(EXPIRED_NOTICE);
        }
        throw err;
      }
    },
    [endSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user: session?.user ?? null, notice, login, register, logout, clearNotice, request }),
    [session, notice, login, register, logout, clearNotice, request],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth должен вызываться внутри AuthProvider');
  }
  return ctx;
}
