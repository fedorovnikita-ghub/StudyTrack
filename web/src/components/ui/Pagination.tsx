'use client';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, limit, total, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Страницы списка">
      <button type="button" className="btn btn-small" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Назад
      </button>
      <span className="muted">
        Страница {page} из {pages} · всего {total}
      </span>
      <button type="button" className="btn btn-small" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Вперед →
      </button>
    </nav>
  );
}
