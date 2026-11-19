'use client';

import Link from 'next/link';
import { useState } from 'react';
import Pagination from '@/components/ui/Pagination';
import QueryView from '@/components/ui/QueryView';
import { formatDateTime } from '@/lib/format';
import { LIMITS } from '@/lib/limits';
import { buildQuery } from '@/lib/query-string';
import { useRealtimeRefresh } from '@/lib/realtime';
import { Page, Submission, SUBMISSION_STATUS_LABELS } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api-query';

// История версий студента: от новой к старой
export default function MyVersions({ assignmentId, refreshKey }: { assignmentId: string; refreshKey: number }) {
  const [page, setPage] = useState(1);
  // Список перечитывается после сдачи в этом окне (refreshKey) и по событиям из других окон
  const live = useRealtimeRefresh({ types: ['submission.created', 'grade.changed'], assignmentId });
  const versions = useApiQuery<Page<Submission>>(
    `/assignments/${assignmentId}/submissions${buildQuery({ page, limit: LIMITS.pageLimit })}`,
    refreshKey + live,
  );

  return (
    <section className="card stack">
      <h2>История моих версий</h2>
      <QueryView query={versions}>
        {(data) =>
          data.items.length === 0 ? (
            <p className="muted">Вы еще не сдавали это задание.</p>
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Версия</th>
                      <th scope="col">Отправлена</th>
                      <th scope="col">Статус</th>
                      <th scope="col">Оценка</th>
                      <th scope="col">Текст</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((s) => (
                      <tr key={s.id}>
                        <td>№{s.number}</td>
                        <td>
                          {formatDateTime(s.submittedAt)}{' '}
                          {s.isLate && <span className="badge badge-warning">с опозданием</span>}
                        </td>
                        <td>{SUBMISSION_STATUS_LABELS[s.status]}</td>
                        <td>{s.currentGrade ? `${s.currentGrade.score} б.` : '—'}</td>
                        <td>
                          <Link href={`/submissions/${s.id}`}>Открыть</Link>
                        </td>
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
