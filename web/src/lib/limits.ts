// Те же ограничения, что в api/src/common/limits.ts. При изменении менять в обоих местах
export const LIMITS = {
  displayName: { min: 2, max: 80 },
  email: { max: 254 },
  password: { min: 10, maxBytes: 72 },
  categoryName: { min: 2, max: 80 },
  title: { min: 3, max: 120 },
  description: { max: 4000 },
  reason: { min: 3, max: 500 },
  search: { max: 100 },
  pageLimit: 20,
} as const;

export function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}
