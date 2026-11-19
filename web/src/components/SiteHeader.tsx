'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ROLE_LABELS } from '@/lib/types';

// Навигация зависит от роли. Ссылки на разделы будут добавляться по мере готовности страниц
export default function SiteHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/');
  }

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="logo">
          StudyTrack
        </Link>
        <nav className="nav" aria-label="Основная навигация">
          {user ? (
            <>
              <Link href="/me">Личный кабинет</Link>
              <span className="nav-user muted">
                {user.displayName} · {ROLE_LABELS[user.role]}
              </span>
              <button type="button" className="btn btn-small" onClick={handleLogout}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link href="/login">Вход</Link>
              <Link href="/register">Регистрация</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
