'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, FieldErrors } from './api';
import { useAuth } from './auth-context';
import { API_URL } from './config';
import { ApiQuery } from './use-api-query';

interface GraphqlResponse<T> {
  data?: T | null;
  errors?: { message: string; extensions?: { code?: string; status?: number; fields?: FieldErrors } }[];
}

// Запрос к /graphql. Ошибки GraphQL превращаются в тот же ApiError, что и ошибки REST,
// поэтому экраны показывают их одинаково
export async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown>,
  token: string | null,
  signal?: AbortSignal,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ query, variables }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Нет связи с сервером. Проверьте подключение и повторите');
  }

  const body = (await res.json().catch(() => null)) as GraphqlResponse<T> | null;
  const first = body?.errors?.[0];
  if (first) {
    const ext = first.extensions ?? {};
    throw new ApiError(ext.status ?? res.status, ext.code ?? 'GRAPHQL_ERROR', first.message, ext.fields ?? {});
  }
  if (!res.ok || !body?.data) {
    throw new ApiError(res.status, `HTTP_${res.status}`, 'Не удалось выполнить запрос');
  }
  return body.data;
}

interface Result<T> {
  key: string;
  status: Exclude<ApiQuery<T>['status'], 'loading'>;
  data?: T;
  error?: ApiError;
}

// Те же состояния, что у useApiQuery (loading / success / error / forbidden / not-found)
export function useGraphqlQuery<T>(query: string, variables: Record<string, unknown>): ApiQuery<T> {
  const { token, logout } = useAuth();
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const variablesKey = JSON.stringify(variables);
  const key = `${query}#${variablesKey}#${reloadCount}#${token ?? ''}`;

  useEffect(() => {
    const controller = new AbortController();
    graphqlRequest<T>(query, JSON.parse(variablesKey) as Record<string, unknown>, token, controller.signal)
      .then((data) => setResult({ key, status: 'success', data }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const error = err instanceof ApiError ? err : new ApiError(0, 'UNKNOWN', 'Не удалось загрузить данные');
        if (error.status === 401) logout(); // сессия истекла
        const status = error.status === 403 ? 'forbidden' : error.status === 404 ? 'not-found' : 'error';
        setResult({ key, status, error });
      });
    return () => controller.abort();
  }, [query, variablesKey, token, key, logout]);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);
  if (result && result.key === key) {
    return { status: result.status, data: result.data, error: result.error, refreshing: false, reload };
  }
  return { status: 'loading', data: undefined, error: undefined, refreshing: false, reload };
}
