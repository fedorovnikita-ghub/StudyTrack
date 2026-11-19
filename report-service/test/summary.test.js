import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_FACTS, summarize, validateFacts } from '../src/summary.js';

test('сводка: ручной пример из docs/reports.md', () => {
  // Задание A: оценки 8 и 6, задание B: оценка 15
  const result = summarize([
    { group: 'A', value: 8 },
    { group: 'A', value: 6 },
    { group: 'B', value: 15 },
  ]);
  assert.deepEqual(result, [
    { group: 'A', count: 2, total: 14, average: 7 },
    { group: 'B', count: 1, total: 15, average: 15 },
  ]);
});

test('пустой набор дает пустую сводку, среднее округляется до 2 знаков', () => {
  assert.deepEqual(summarize([]), []);
  assert.equal(summarize([{ group: 'x', value: 1 }, { group: 'x', value: 2 }, { group: 'x', value: 2 }])[0].average, 1.67);
});

test('проверка фактов: типы, конечность чисел, лишние поля, предел массива', () => {
  assert.equal(validateFacts({ facts: [] }), null);
  assert.equal(validateFacts({ facts: [{ group: 'a', value: 0 }] }), null);
  assert.match(validateFacts({ facts: [{ group: 'a', value: '5' }] }), /конечным числом/);
  assert.match(validateFacts({ facts: [{ group: 'a', value: Number.POSITIVE_INFINITY }] }), /конечным числом/);
  assert.match(validateFacts({ facts: [{ group: '', value: 1 }] }), /непустой строкой/);
  assert.match(validateFacts({ facts: [{ group: 'a', value: 1, student: 'x' }] }), /ровно поля/);
  assert.match(validateFacts({ facts: [], extra: 1 }), /Неизвестные поля/);
  const tooMany = Array.from({ length: MAX_FACTS + 1 }, () => ({ group: 'a', value: 1 }));
  assert.match(validateFacts({ facts: tooMany }), /Не больше/);
});
