'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@/lib/types';
import Alert from './ui/Alert';

interface RequireAuthProps {
  roles?: UserRole[];
  children: React.ReactNode;
}

// Обертка закрытых страниц. Это только удобство интерфейса: права проверяет сервер
export default function RequireAuth({ roles, children }: RequireAuthProps) {
  const { user, notice } = useAuth();
  const pathname = usePathname();

  if (!user) {
    return (
      <section className="card stack">
        <h1>Нужно войти</h1>
        {notice && <Alert kind="warning">{notice}</Alert>}
        <p className="muted">Эта страница доступна только после входа. После обновления страницы вход нужно повторить.</p>
        <p>
          <Link className="btn btn-primary" href={`/login?next=${encodeURIComponent(pathname)}`}>
            Войти
          </Link>
        </p>
      </section>
    );
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <section className="card stack">
        <h1>Нет доступа</h1>
        <p className="muted">Эта страница недоступна для вашей роли.</p>
        <p>
          <Link className="btn" href="/me">
            В личный кабинет
          </Link>
        </p>
      </section>
    );
  }

  return <>{children}</>;
}
