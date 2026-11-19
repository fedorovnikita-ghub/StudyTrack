'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from './api';
import { useAuth } from './auth-context';

export type QueryStatus = 'loading' | 'success' | 'error' | 'forbidden' | 'not-found';

interface QueryResult<T> {
  key: string;
  path: string;
  status: Exclude<QueryStatus, 'loading'>;
  data?: T;
  error?: ApiError;
}

export interface ApiQuery<T> {
  status: QueryStatus;
  data: T | undefined;
  error: ApiError | undefined;
  refreshing: boolean; // идет повторная загрузка, на экране пока прежние данные
  reload: () => void;
}

// Загрузка данных с API со всеми состояниями: loading / success / error / forbidden / not-found.
// При повторной загрузке того же адреса прежние данные остаются на экране,
// чтобы формы на странице не сбрасывались
export function useApiQuery<T>(path: string | null): ApiQuery<T> {
  const { request } = useAuth();
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<QueryResult<T> | null>(null);
  const key = `${path}#${reloadCount}`;

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();

    request<T>(path, { signal: controller.signal })
      .then((data) => setResult({ key, path, status: 'success', data }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const error = err instanceof ApiError ? err : new ApiError(0, 'UNKNOWN', 'Не удалось загрузить данные');
        const status = error.status === 403 ? 'forbidden' : error.status === 404 ? 'not-found' : 'error';
        setResult({ key, path, status, error });
      });

    return () => controller.abort();
  }, [path, key, request]);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  if (result && result.key === key) {
    return { status: result.status, data: result.data, error: result.error, refreshing: false, reload };
  }
  if (result && result.path === path && result.status === 'success') {
    return { status: 'success', data: result.data, error: undefined, refreshing: true, reload };
  }
  return { status: 'loading', data: undefined, error: undefined, refreshing: false, reload };
}
