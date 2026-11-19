'use client';

import { RealtimeStatus, useRealtimeStatus } from '@/lib/realtime';

const LABELS: Record<Exclude<RealtimeStatus, 'off'>, { text: string; className: string }> = {
  connecting: { text: 'подключение…', className: 'rt rt-wait' },
  connected: { text: 'онлайн', className: 'rt rt-ok' },
  disconnected: { text: 'нет связи, переподключаемся', className: 'rt rt-bad' },
  rejected: { text: 'обновления недоступны', className: 'rt rt-bad' },
};

// Состояние соединения реального времени: обрыв виден пользователю
export default function RealtimeIndicator() {
  const status = useRealtimeStatus();
  if (status === 'off') return null;
  const label = LABELS[status];
  return (
    <span className={label.className} role="status" title="Автообновление данных">
      <span className="rt-dot" aria-hidden="true" />
      {label.text}
    </span>
  );
}
