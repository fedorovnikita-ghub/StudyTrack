// Экранирует спецсимволы, чтобы строка поиска стала обычным текстом в RegExp,
// а не пользовательским регулярным выражением
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function searchRegex(search: string | undefined): RegExp | null {
  const text = search?.trim();
  return text ? new RegExp(escapeRegex(text), 'i') : null;
}
