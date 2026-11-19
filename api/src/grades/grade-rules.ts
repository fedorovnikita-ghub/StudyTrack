// Предметные правила оценивания: чистые функции без базы данных, покрыты unit-тестами

// Балл - целое число от 0 до максимального балла задания включительно
export function isValidScore(score: number, maxScore: number): boolean {
  return Number.isInteger(score) && score >= 0 && score <= maxScore;
}

export interface VersionGrade {
  number: number;
  score: number | null; // null - версия еще не оценена
}

// Текущий результат = оценка последней ОЦЕНЕННОЙ версии (с наибольшим номером среди оцененных).
// Неоцененная новая версия не обнуляет результат, прежние оценки сохраняются в истории
export function currentResult(versions: VersionGrade[]): { number: number; score: number } | null {
  let best: { number: number; score: number } | null = null;
  for (const v of versions) {
    if (v.score === null) continue;
    if (!best || v.number > best.number) {
      best = { number: v.number, score: v.score };
    }
  }
  return best;
}

// Процент с одним знаком после запятой. При нулевом максимуме результата нет
export function percentOf(score: number, max: number): number | null {
  if (max <= 0) return null;
  return Math.round((score / max) * 1000) / 10;
}
