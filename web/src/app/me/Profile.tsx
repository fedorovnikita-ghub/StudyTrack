'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ROLE_LABELS } from '@/lib/types';

export default function Profile() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="stack">
      <section className="card">
        <h1>Личный кабинет</h1>
        <dl className="details">
          <dt>Имя</dt>
          <dd>{user.displayName}</dd>
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Роль</dt>
          <dd>{ROLE_LABELS[user.role]}</dd>
        </dl>
      </section>

      <section className="card">
        <h2>Разделы</h2>
        <p className="actions">
          <Link className="btn" href="/courses">
            Мои курсы
          </Link>
          {user.role === 'teacher' && (
            <>
              <Link className="btn" href="/courses/new">
                Создать курс
              </Link>
              <Link className="btn" href="/categories">
                Категории
              </Link>
            </>
          )}
        </p>
      </section>
    </div>
  );
}
