'use client';

import Link from 'next/link';
import { useState } from 'react';
import Pagination from '@/components/ui/Pagination';
import QueryView from '@/components/ui/QueryView';
import { formatDateTime, TIME_ZONE_LABEL } from '@/lib/format';
import { buildQuery } from '@/lib/query-string';
import { AssignmentResult, CourseResult, Page } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api-query';

const COURSES_PER_PAGE = 5;

function statusText(r: AssignmentResult): { text: string; badge: string } {
  if (r.versionsCount === 0) {
    return r.assignment.isOverdue
      ? { text: 'не сдано, срок прошел', badge: 'badge badge-danger' }
      : { text: 'не сдано', badge: 'badge' };
  }
  if (r.currentScore === null) return { text: 'ожидает оценки', badge: 'badge' };
  return { text: 'оценено', badge: 'badge badge-success' };
}

// Личные результаты: текущий балл = оценка последней оцененной версии
export default function MyResults() {
  const [page, setPage] = useState(1);
  const results = useApiQuery<Page<CourseResult>>(`/results/my${buildQuery({ page, limit: COURSES_PER_PAGE })}`);

  return (
    <div className="stack">
      <h1>Мои результаты</h1>
      <p className="muted">
        Текущий балл по заданию — оценка последней оцененной версии работы. Баллы указаны в целых числах.
      </p>
      <QueryView query={results}>
        {(data) =>
          data.items.length === 0 ? (
            <div className="card empty">
              <p>Вы пока не зачислены ни на один курс.</p>
            </div>
          ) : (
            <>
              {data.items.map((c) => (
                <section key={c.course.id} className="card stack">
                  <div className="page-head">
                    <h2>
                      <Link href={`/courses/${c.course.id}`}>{c.course.title}</Link>
                    </h2>
                    <span className="badge">
                      {c.totalScore} из {c.maxTotal} б.{c.percent !== null ? ` · ${c.percent}%` : ''}
                    </span>
                  </div>
                  {c.assignments.length === 0 ? (
                    <p className="muted">В курсе пока нет заданий.</p>
                  ) : (
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th scope="col">Задание</th>
                            <th scope="col">Срок ({TIME_ZONE_LABEL})</th>
                            <th scope="col">Версий</th>
                            <th scope="col">Статус</th>
                            <th scope="col">Балл</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.assignments.map((r) => {
                            const st = statusText(r);
                            return (
                              <tr key={r.assignment.id}>
                                <td>
                                  <Link href={`/assignments/${r.assignment.id}`}>{r.assignment.title}</Link>
                                </td>
                                <td>{formatDateTime(r.assignment.dueAt)}</td>
                                <td>
                                  {r.versionsCount}{' '}
                                  {r.hasLate && <span className="badge badge-warning">есть просрочка</span>}
                                </td>
                                <td>
                                  <span className={st.badge}>{st.text}</span>
                                </td>
                                <td>
                                  {r.currentScore !== null
                                    ? `${r.currentScore} из ${r.assignment.maxScore} (версия №${r.gradedVersion})`
                                    : `— из ${r.assignment.maxScore}`}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr>
                            <th scope="row" colSpan={4}>
                              Итого: оценено {c.gradedCount} из {c.assignmentsCount}
                            </th>
                            <td>
                              <strong>
                                {c.totalScore} из {c.maxTotal}
                              </strong>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </section>
              ))}
              <Pagination page={data.page} limit={data.limit} total={data.total} onChange={setPage} />
            </>
          )
        }
      </QueryView>
    </div>
  );
}
