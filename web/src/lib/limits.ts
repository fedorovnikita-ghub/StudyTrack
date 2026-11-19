// Те же ограничения, что в api/src/common/limits.ts. При изменении менять в обоих местах
export const LIMITS = {
  displayName: { min: 2, max: 80 },
  email: { max: 254 },
  password: { min: 10, maxBytes: 72 },
  categoryName: { min: 2, max: 80 },
  title: { min: 3, max: 120 },
  description: { max: 4000 },
  assignmentText: { min: 1, max: 4000 },
  submissionText: { max: 20000 },
  maxScore: { min: 1, max: 1000 },
  maxVersions: { min: 1, max: 50, default: 20 },
  minTextLength: { min: 1, max: 5000, default: 1 },
  gradeComment: { max: 2000 },
  reason: { min: 3, max: 500 },
  search: { max: 100 },
  pageLimit: 20,
} as const;

export function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}
