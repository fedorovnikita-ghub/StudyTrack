// Проверка входных фактов и расчет сводки. Чистые функции, покрыты тестами

export const MAX_FACTS = 5000;
const MAX_GROUP_LENGTH = 200;

// Возвращает текст ошибки или null, если факты корректны
export function validateFacts(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'Тело запроса должно быть объектом { facts: [...] }';
  }
  const unknownKeys = Object.keys(body).filter((key) => key !== 'facts');
  if (unknownKeys.length > 0) {
    return `Неизвестные поля: ${unknownKeys.join(', ')}`;
  }
  const { facts } = body;
  if (!Array.isArray(facts)) {
    return 'facts должен быть массивом';
  }
  if (facts.length > MAX_FACTS) {
    return `Не больше ${MAX_FACTS} фактов за запрос`;
  }
  for (let i = 0; i < facts.length; i += 1) {
    const fact = facts[i];
    if (typeof fact !== 'object' || fact === null || Array.isArray(fact)) {
      return `facts[${i}] должен быть объектом`;
    }
    const keys = Object.keys(fact);
    if (keys.length !== 2 || !keys.includes('group') || !keys.includes('value')) {
      return `facts[${i}] должен содержать ровно поля group и value`;
    }
    if (typeof fact.group !== 'string' || fact.group.length === 0 || fact.group.length > MAX_GROUP_LENGTH) {
      return `facts[${i}].group должен быть непустой строкой до ${MAX_GROUP_LENGTH} символов`;
    }
    // Number.isFinite отсекает NaN, Infinity и строки вида "5"
    if (typeof fact.value !== 'number' || !Number.isFinite(fact.value)) {
      return `facts[${i}].value должен быть конечным числом`;
    }
  }
  return null;
}

// Сводка по группам: количество, сумма и среднее (2 знака после запятой)
export function summarize(facts) {
  const groups = new Map();
  for (const { group, value } of facts) {
    const current = groups.get(group) ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += value;
    groups.set(group, current);
  }
  return [...groups.entries()]
    .map(([group, { count, total }]) => ({
      group,
      count,
      total: Math.round(total * 100) / 100,
      average: Math.round((total / count) * 100) / 100,
    }))
    .sort((a, b) => a.group.localeCompare(b.group));
}
