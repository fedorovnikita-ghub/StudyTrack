import { AppError } from './app-error';

// Отчеты принимают календарные даты (YYYY-MM-DD) по времени Алматы.
// В базе все даты хранятся в UTC, поэтому границы дня переводятся в UTC здесь
export const REPORT_TIME_ZONE = 'Asia/Almaty';
export const MAX_REPORT_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

// Смещение часового пояса Алматы в минутах для конкретного момента
function zoneOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: REPORT_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - date.getTime()) / 60000);
}

// "2026-11-19" -> число дней от 1970-01-01 (для арифметики над календарными датами)
function dayNumber(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const check = new Date(ms);
  // Отсекаем несуществующие даты вроде 2026-02-31
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return ms / DAY_MS;
}

function fromDayNumber(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

// Начало календарного дня по Алматы как момент UTC
function zonedDayStart(day: number): Date {
  const wallAsUtc = day * DAY_MS;
  return new Date(wallAsUtc - zoneOffsetMinutes(new Date(wallAsUtc)) * 60000);
}

export function todayInZone(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: REPORT_TIME_ZONE }).format(now);
}

export interface ReportPeriod {
  from: string; // включительно
  to: string; // включительно
  start: Date; // начало дня from (UTC)
  end: Date; // начало дня ПОСЛЕ to (UTC), граница не включается
}

// Период отчета. По умолчанию: 60 дней назад - 29 дней вперед (90 дней)
export function resolvePeriod(from?: string, to?: string, now = new Date()): ReportPeriod {
  if (Boolean(from) !== Boolean(to)) {
    const message = 'Укажите обе даты периода';
    throw new AppError(400, 'VALIDATION_ERROR', message, from ? { to: message } : { from: message });
  }

  const today = dayNumber(todayInZone(now)) as number;
  const fromDay = from ? dayNumber(from) : today - 60;
  const toDay = to ? dayNumber(to) : today + 29;

  if (fromDay === null) throw new AppError(400, 'VALIDATION_ERROR', 'Неверная дата', { from: 'Несуществующая дата' });
  if (toDay === null) throw new AppError(400, 'VALIDATION_ERROR', 'Неверная дата', { to: 'Несуществующая дата' });
  if (fromDay > toDay) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Неверный период', { to: 'Дата окончания раньше даты начала' });
  }
  if (toDay - fromDay + 1 > MAX_REPORT_DAYS) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Слишком длинный период', {
      to: `Период не длиннее ${MAX_REPORT_DAYS} дней`,
    });
  }

  return {
    from: fromDayNumber(fromDay),
    to: fromDayNumber(toDay),
    start: zonedDayStart(fromDay),
    end: zonedDayStart(toDay + 1),
  };
}

// "2026-11-19 14:05" по времени Алматы (для CSV)
export function formatZoned(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}
