'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './auth-context';
import { API_URL } from './config';

export type RealtimeStatus = 'off' | 'connecting' | 'connected' | 'disconnected' | 'rejected';
export type RealtimeEventType = 'submission.created' | 'grade.changed';

export interface RealtimeEvent {
  type: RealtimeEventType | 'reconnect';
  submissionId?: string;
  assignmentId?: string;
  courseId?: string;
  studentId?: string;
}

type Listener = (event: RealtimeEvent) => void;

interface RealtimeContextValue {
  status: RealtimeStatus;
  subscribe: (listener: Listener) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

// Одно Socket.IO-соединение на вкладку, пока пользователь вошел.
// Выход (токен пропал) закрывает соединение.
// После переподключения рассылается служебное событие "reconnect": экраны перечитывают данные с API,
// потому что события за время обрыва могли потеряться
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const listeners = useRef(new Set<Listener>());
  const [state, setState] = useState<{ token: string | null; status: RealtimeStatus }>({
    token: null,
    status: 'off',
  });

  useEffect(() => {
    if (!token) return;

    const socket = io(API_URL, { auth: { token }, reconnectionDelayMax: 10_000 });
    let readyBefore = false;
    const dispatch = (event: RealtimeEvent) => listeners.current.forEach((listener) => listener(event));

    socket.on('realtime.ready', () => {
      setState({ token, status: 'connected' });
      if (readyBefore) dispatch({ type: 'reconnect' });
      readyBefore = true;
    });
    socket.on('disconnect', () => setState({ token, status: 'disconnected' }));
    socket.on('connect_error', () => setState({ token, status: 'disconnected' }));
    socket.on('auth.error', () => setState({ token, status: 'rejected' }));
    socket.on('submission.created', (payload: RealtimeEvent) => dispatch({ ...payload, type: 'submission.created' }));
    socket.on('grade.changed', (payload: RealtimeEvent) => dispatch({ ...payload, type: 'grade.changed' }));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [token]);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  // Пока для нового токена нет ответа сервера - "подключение"
  const status: RealtimeStatus = !token ? 'off' : state.token === token ? state.status : 'connecting';

  return <RealtimeContext.Provider value={{ status, subscribe }}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeStatus(): RealtimeStatus {
  return useRealtimeContext().status;
}

interface RealtimeFilter {
  types: RealtimeEventType[];
  assignmentId?: string;
  courseId?: string;
  submissionId?: string;
}

function matches(event: RealtimeEvent, f: RealtimeFilter): boolean {
  if (event.type === 'reconnect') return true;
  if (!f.types.includes(event.type)) return false;
  if (f.assignmentId && event.assignmentId !== f.assignmentId) return false;
  if (f.courseId && event.courseId !== f.courseId) return false;
  if (f.submissionId && event.submissionId !== f.submissionId) return false;
  return true;
}

// Счетчик, который растет при подходящем событии или переподключении.
// Передается в useApiQuery как refreshKey - экран перечитывает актуальные данные с API
export function useRealtimeRefresh(filter: RealtimeFilter): number {
  const { subscribe } = useRealtimeContext();
  const [tick, setTick] = useState(0);
  const filterKey = JSON.stringify(filter);

  useEffect(() => {
    const parsed = JSON.parse(filterKey) as RealtimeFilter;
    return subscribe((event) => {
      if (matches(event, parsed)) setTick((n) => n + 1);
    });
  }, [subscribe, filterKey]);

  return tick;
}

function useRealtimeContext(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error('Realtime-хуки должны вызываться внутри RealtimeProvider');
  }
  return ctx;
}
