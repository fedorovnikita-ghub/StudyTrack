'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function HomeActions() {
  const { user } = useAuth();

  if (user) {
    return (
      <p>
        <Link className="btn btn-primary" href="/me">
          Перейти в личный кабинет
        </Link>
      </p>
    );
  }

  return (
    <p className="actions">
      <Link className="btn btn-primary" href="/login">
        Войти
      </Link>
      <Link className="btn" href="/register">
        Зарегистрироваться
      </Link>
    </p>
  );
}
