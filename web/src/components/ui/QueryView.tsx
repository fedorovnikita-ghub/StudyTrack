'use client';

import Link from 'next/link';
import { ApiQuery } from '@/lib/use-api-query';
import Alert from './Alert';

interface QueryViewProps<T> {
  query: ApiQuery<T>;
  notFoundText?: string;
  children: (data: T) => React.ReactNode;
}

// Единое отображение состояний загрузки для списков и карточек
export default function QueryView<T>({ query, notFoundText, children }: QueryViewProps<T>) {
  if (query.status === 'loading') {
    return (
      <p className="muted" role="status">
        Загрузка…
      </p>
    );
  }

  if (query.status === 'forbidden') {
    return <Alert kind="warning">{query.error?.message ?? 'Недостаточно прав для просмотра'}</Alert>;
  }

  if (query.status === 'not-found') {
    return (
      <div className="stack">
        <Alert kind="warning">{notFoundText ?? 'Объект не найден или у вас нет к нему доступа'}</Alert>
        <p>
          <Link href="/me" className="btn">
            В личный кабинет
          </Link>
        </p>
      </div>
    );
  }

  if (query.status === 'error') {
    return (
      <Alert kind="error">
        <p className="alert-text">{query.error?.message ?? 'Не удалось загрузить данные'}</p>
        <button type="button" className="btn btn-small" onClick={query.reload}>
          Повторить
        </button>
      </Alert>
    );
  }

  return (
    <>
      {query.refreshing && (
        <p className="muted refreshing" role="status">
          Обновляем…
        </p>
      )}
      {children(query.data as T)}
    </>
  );
}
