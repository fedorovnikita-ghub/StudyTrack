// Общие ограничения полей. Те же числа используются в DTO и в формах сайта
export const LIMITS = {
  displayName: { min: 2, max: 80 },
  email: { max: 254 },
  password: { min: 10, maxBytes: 72 }, // bcrypt учитывает только первые 72 байта
  categoryName: { min: 2, max: 80 },
  title: { min: 3, max: 120 },
  description: { max: 4000 },
  assignmentText: { min: 1, max: 4000 },
  submissionText: { min: 1, max: 20000 },
  gradeComment: { max: 2000 },
  reason: { min: 3, max: 500 },
  search: { max: 100 },
  maxScore: { min: 1, max: 1000 },
  maxVersions: { min: 1, max: 50, default: 20 },
  minTextLength: { min: 1, max: 5000, default: 1 },
  page: { defaultLimit: 20, maxLimit: 100, maxPage: 10000 },
} as const;
