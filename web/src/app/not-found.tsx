import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="card stack">
      <h1>Страница не найдена</h1>
      <p className="muted">Такой страницы нет, или у вас нет к ней доступа.</p>
      <p>
        <Link href="/" className="btn btn-primary">
          На главную
        </Link>
      </p>
    </section>
  );
}
