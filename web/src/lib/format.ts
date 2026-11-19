// Даты хранятся в UTC, показываются в часовом поясе Asia/Almaty
export const TIME_ZONE = 'Asia/Almaty';
export const TIME_ZONE_LABEL = 'время Алматы';

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return dateTimeFormatter.format(new Date(iso));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return dateFormatter.format(new Date(iso));
}

// Смещение часового пояса Алматы (в минутах) для конкретного момента
function almatyOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
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

// Значение поля datetime-local ("2026-11-25T23:59") считаем временем Алматы и переводим в ISO UTC
export function almatyInputToIso(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const wallAsUtc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  const offset = almatyOffsetMinutes(new Date(wallAsUtc));
  return new Date(wallAsUtc - offset * 60000).toISOString();
}
