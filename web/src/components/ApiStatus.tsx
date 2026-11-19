'use client';

import { useEffect, useState } from 'react';
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
  const [attempt, setAttempt] = useState(0); // увеличение запускает повторную проверку

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let cancelled = false; // эффект уже снят: результат этого запроса не нужен

    // setState вызывается только в колбэках Promise, а не прямо в теле эффекта
    fetch(`${API_URL}/api/v1/health`, { cache: 'no-store', signal: controller.signal })
      .then((res) => {
        if (!cancelled) setStatus(res.ok ? 'up' : res.status === 503 ? 'db-down' : 'down');
      })
      .catch(() => {
        if (!cancelled) setStatus('down');
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  function retry() {
    setStatus('checking');
    setAttempt((n) => n + 1);
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
