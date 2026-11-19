// Те же ограничения, что в api/src/common/limits.ts. При изменении менять в обоих местах
export const LIMITS = {
  displayName: { min: 2, max: 80 },
  email: { max: 254 },
  password: { min: 10, maxBytes: 72 },
} as const;

export function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}
