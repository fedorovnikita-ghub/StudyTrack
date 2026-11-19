'use client';

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
    </div>
  );
}
