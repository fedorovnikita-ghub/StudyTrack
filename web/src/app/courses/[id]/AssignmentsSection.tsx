'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import Pagination from '@/components/ui/Pagination';
import QueryView from '@/components/ui/QueryView';
import { formatDateTime, TIME_ZONE_LABEL } from '@/lib/format';
import { LIMITS } from '@/lib/limits';
import { buildQuery } from '@/lib/query-string';
import { useRealtimeRefresh } from '@/lib/realtime';
import { Assignment, Page } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api-query';

interface AssignmentsSectionProps {
  courseId: string;
  isOwner: boolean;
  courseActive: boolean;
}

export default function AssignmentsSection({ courseId, isOwner, courseActive }: AssignmentsSectionProps) {
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');

  const live = useRealtimeRefresh({ types: ['submission.created'], courseId });
  const assignments = useApiQuery<Page<Assignment>>(
    `/courses/${courseId}/assignments${buildQuery({ page, limit: LIMITS.pageLimit, search })}`,
    live,
  );

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  }

  return (
    <section className="card stack">
      <div className="page-head">
        <h2>Задания</h2>
        {isOwner && courseActive && (
          <Link className="btn btn-primary" href={`/courses/${courseId}/assignments/new`}>
            Новое задание
          </Link>
        )}
      </div>

      <form className="search-row" onSubmit={handleSearch} role="search">
        <label htmlFor="assignment-search" className="visually-hidden">
          Поиск задания по названию
        </label>
        <input
          id="assignment-search"
          type="search"
          placeholder="Поиск по названию"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          maxLength={LIMITS.search.max}
        />
        <button type="submit" className="btn btn-small">
          Найти
        </button>
      </form>

      <QueryView query={assignments}>
        {(data) =>
          data.items.length === 0 ? (
            <p className="muted">{search ? 'Заданий не найдено.' : 'Заданий пока нет.'}</p>
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Задание</th>
                      <th scope="col">Срок ({TIME_ZONE_LABEL})</th>
                      <th scope="col">Макс. балл</th>
                      {!isOwner && <th scope="col">Мои сдачи</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <Link href={`/assignments/${a.id}`}>{a.title}</Link>
                        </td>
                        <td>
                          {formatDateTime(a.dueAt)}{' '}
                          {a.isOverdue && <span className="badge badge-warning">срок прошел</span>}
                        </td>
                        <td>{a.maxScore} б.</td>
                        {!isOwner && (
                          <td>
                            {a.my && a.my.submissionsCount > 0 ? (
                              <>
                                версий: {a.my.submissionsCount}, последняя {formatDateTime(a.my.lastSubmittedAt)}
                              </>
                            ) : (
                              <span className="muted">не сдано</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={data.page} limit={data.limit} total={data.total} onChange={setPage} />
            </>
          )
        }
      </QueryView>
    </section>
  );
}
