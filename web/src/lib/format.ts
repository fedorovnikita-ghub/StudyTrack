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
