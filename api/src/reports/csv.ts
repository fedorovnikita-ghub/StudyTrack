// Формирование строк CSV для Excel с русской локалью: разделитель ";", кодировка UTF-8 с BOM

export const CSV_BOM = '﻿';
const SEPARATOR = ';';

// Значение, которое табличная программа может принять за формулу (=, +, -, @, табуляция, перевод строки)
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'да' : 'нет';

  let text = value;
  // Нейтрализация формулы: апостроф в начале, Excel покажет текст как есть
  if (FORMULA_START.test(text)) text = `'${text}`;
  // Экранирование: кавычки удваиваются, ячейка с разделителем, кавычкой или переводом строки берется в кавычки
  if (/[";\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function csvLine(values: Array<string | number | boolean | null | undefined>): string {
  return values.map(csvCell).join(SEPARATOR) + '\r\n';
}
