// Предметные правила сдачи работ: чистые функции без базы данных, покрыты unit-тестами

// Номер следующей версии: 1 для первой сдачи, дальше +1 к последнему номеру
export function nextVersionNumber(lastNumber: number | null | undefined): number {
  return (lastNumber ?? 0) + 1;
}

// Сдача ровно в момент срока считается вовремя, просрочка - строго позже срока
export function isLateSubmission(submittedAt: Date, dueAt: Date): boolean {
  return submittedAt.getTime() > dueAt.getTime();
}

// Можно ли отправить еще одну версию
export function canSubmitVersion(nextNumber: number, maxVersions: number): boolean {
  return nextNumber <= maxVersions;
}

// Длина текста работы без пробелов по краям
export function submissionTextLength(text: string): number {
  return text.trim().length;
}
