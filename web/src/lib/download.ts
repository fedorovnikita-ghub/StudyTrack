import { ApiError } from './api';
import { API_URL } from './config';

// Скачивание файла с API с токеном в заголовке (ссылкой нельзя: токен хранится только в памяти).
// Ошибки до начала выгрузки сервер отдает JSON - показываем их как обычные ошибки API
export async function downloadFile(path: string, token: string | null, fallbackName: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Нет связи с сервером. Повторите попытку');
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(res.status, data?.error?.code ?? `HTTP_${res.status}`, data?.error?.message ?? 'Не удалось скачать файл');
  }

  const blob = await res.blob();
  const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = match?.[1] ?? fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
