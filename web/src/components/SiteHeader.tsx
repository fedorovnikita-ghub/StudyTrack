'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ROLE_LABELS } from '@/lib/types';
import RealtimeIndicator from './RealtimeIndicator';

// Навигация зависит от роли
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
              <Link href="/courses">Мои курсы</Link>
              {user.role === 'teacher' && <Link href="/grading">Оценивание</Link>}
              {user.role === 'teacher' && <Link href="/categories">Категории</Link>}
              {user.role === 'student' && <Link href="/results">Мои результаты</Link>}
              <Link href="/me">Личный кабинет</Link>
              <RealtimeIndicator />
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
