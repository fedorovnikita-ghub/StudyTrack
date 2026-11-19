// Ошибка уникального индекса MongoDB (E11000 duplicate key)
export function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}
