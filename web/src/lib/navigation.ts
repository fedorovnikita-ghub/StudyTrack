// Разрешаем возврат только на свои страницы, чтобы ?next= нельзя было увести на чужой сайт
export function safeNextPath(next: string | undefined | null, fallback = '/me'): string {
  if (typeof next !== 'string') return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
