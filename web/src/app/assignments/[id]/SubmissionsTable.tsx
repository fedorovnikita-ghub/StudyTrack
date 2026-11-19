'use client';

import Link from 'next/link';
import { useState } from 'react';
import Pagination from '@/components/ui/Pagination';
import QueryView from '@/components/ui/QueryView';
import SelectField from '@/components/ui/SelectField';
import { formatDateTime } from '@/lib/format';
import { LIMITS } from '@/lib/limits';
import { buildQuery } from '@/lib/query-string';
import { useRealtimeRefresh } from '@/lib/realtime';
import { Page, Submission, SUBMISSION_STATUS_LABELS } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api-query';

// Работы студентов по заданию (видит только преподаватель курса)
export default function SubmissionsTable({ assignmentId, maxScore }: { assignmentId: string; maxScore: number }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const live = useRealtimeRefresh({ types: ['submission.created', 'grade.changed'], assignmentId });
  const submissions = useApiQuery<Page<Submission>>(
    `/assignments/${assignmentId}/submissions${buildQuery({ page, limit: LIMITS.pageLimit, status })}`,
    live,
  );

  return (
    <section className="card stack">
      <h2>Работы студентов</h2>
      <div className="filters">
        <SelectField
          label="Статус"
          name="status"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          placeholder="Все работы"
          options={[
            { value: 'submitted', label: SUBMISSION_STATUS_LABELS.submitted },
            { value: 'graded', label: SUBMISSION_STATUS_LABELS.graded },
          ]}
        />
      </div>
      <QueryView query={submissions}>
        {(data) =>
          data.items.length === 0 ? (
            <p className="muted">{status ? 'Работ с таким статусом нет.' : 'Работ пока нет.'}</p>
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Студент</th>
                      <th scope="col">Версия</th>
                      <th scope="col">Отправлена</th>
                      <th scope="col">Статус</th>
                      <th scope="col">Оценка (из {maxScore})</th>
                      <th scope="col">Работа</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((s) => (
                      <tr key={s.id}>
                        <td>{s.student.displayName}</td>
                        <td>№{s.number}</td>
                        <td>
                          {formatDateTime(s.submittedAt)}{' '}
                          {s.isLate && <span className="badge badge-warning">с опозданием</span>}
                        </td>
                        <td>{SUBMISSION_STATUS_LABELS[s.status]}</td>
                        <td>{s.currentGrade ? s.currentGrade.score : '—'}</td>
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
