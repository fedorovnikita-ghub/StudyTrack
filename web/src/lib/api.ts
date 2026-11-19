import { API_URL } from './config';

export type FieldErrors = Record<string, string>;

// Ошибка API в едином формате сервера: { error: { code, message, fields } }
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields: FieldErrors = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

const TIMEOUT_MS = 15_000;

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal,
      cache: 'no-store',
    });
  } catch (err) {
    // Запрос отменил сам компонент (например, ушли со страницы) - это не ошибка сети
    if (options.signal?.aborted) throw err;
    if (timeout.aborted) {
      throw new ApiError(0, 'TIMEOUT', 'Сервер не ответил вовремя. Повторите попытку');
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Нет связи с сервером. Проверьте подключение и повторите');
  }

  if (res.status === 204) {
    return undefined as T;
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const error = (data as { error?: { code?: string; message?: string; fields?: FieldErrors } } | null)?.error;
    throw new ApiError(
      res.status,
      error?.code ?? `HTTP_${res.status}`,
      error?.message ?? 'Не удалось выполнить запрос',
      error?.fields ?? {},
    );
  }

  return data as T;
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}
