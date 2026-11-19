'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '@/lib/config';

type Status = 'checking' | 'up' | 'db-down' | 'down';

const LABELS: Record<Status, { text: string; badge: string }> = {
  checking: { text: 'Проверяем…', badge: 'badge' },
  up: { text: 'API и база данных доступны', badge: 'badge badge-success' },
  'db-down': { text: 'API работает, но база данных недоступна', badge: 'badge badge-warning' },
  down: { text: 'API недоступен', badge: 'badge badge-danger' },
};

// Проверка связи сайта с API: удобно сразу после запуска проекта
export default function ApiStatus() {
  const [status, setStatus] = useState<Status>('checking');

  const runCheck = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/health`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) setStatus('up');
      else if (res.status === 503) setStatus('db-down');
      else setStatus('down');
    } catch {
      setStatus('down');
    }
  }, []);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  function retry() {
    setStatus('checking');
    void runCheck();
  }

  const label = LABELS[status];

  return (
    <section className="card">
      <h2>Состояние системы</h2>
      <p>
        <span className={label.badge} role="status">
          {label.text}
        </span>
      </p>
      {status !== 'checking' && status !== 'up' && (
        <button type="button" className="btn" onClick={retry}>
          Повторить проверку
        </button>
      )}
    </section>
  );
}
