'use client';

import Link from 'next/link';
import { useState } from 'react';
import Pagination from '@/components/ui/Pagination';
import QueryView from '@/components/ui/QueryView';
import SelectField from '@/components/ui/SelectField';
import { formatDateTime, TIME_ZONE_LABEL } from '@/lib/format';
import { LIMITS } from '@/lib/limits';
import { buildQuery } from '@/lib/query-string';
import { useRealtimeRefresh } from '@/lib/realtime';
import { Course, Page, QueueItem, SubmissionStatus } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api-query';

// Кабинет оценивания: работы во всех моих курсах. Ожидающие оценки - самые старые сверху
export default function GradingQueue() {
  const [status, setStatus] = useState<SubmissionStatus>('submitted');
  const [courseId, setCourseId] = useState('');
  const [page, setPage] = useState(1);

  const courses = useApiQuery<Page<Course>>('/courses?limit=100');
  // Новая сдача или оценка в другом окне - очередь перечитывается сама
  const live = useRealtimeRefresh({ types: ['submission.created', 'grade.changed'] });
  const queue = useApiQuery<Page<QueueItem>>(
    `/grading/queue${buildQuery({ status, courseId, page, limit: LIMITS.pageLimit })}`,
    live,
  );

  return (
    <div className="stack">
      <h1>Кабинет оценивания</h1>

      <div className="card filters">
        <SelectField
          label="Курс"
          name="courseId"
          value={courseId}
          onChange={(value) => {
            setCourseId(value);
            setPage(1);
          }}
          placeholder="Все мои курсы"
          options={(courses.data?.items ?? []).map((c) => ({ value: c.id, label: c.title }))}
        />
        <div className="field">
          <span className="field-label">Работы</span>
          <div className="tabs" role="tablist" aria-label="Статус работ">
            {(['submitted', 'graded'] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={status === s}
                className={status === s ? 'tab tab-active' : 'tab'}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
              >
                {s === 'submitted' ? 'Ожидают оценки' : 'Оцененные'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="card">
        <QueryView query={queue}>
          {(data) =>
            data.items.length === 0 ? (
              <p className="muted">
                {status === 'submitted' ? 'Все работы оценены. Новых работ нет.' : 'Оцененных работ пока нет.'}
              </p>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Студент</th>
                        <th scope="col">Курс / задание</th>
                        <th scope="col">Версия</th>
                        <th scope="col">Отправлена ({TIME_ZONE_LABEL})</th>
                        <th scope="col">Оценка</th>
                        <th scope="col">Действие</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((s) => (
                        <tr key={s.id}>
                          <td>{s.student.displayName}</td>
                          <td>
                            <span className="muted">{s.course.title}</span>
                            <br />
                            <Link href={`/assignments/${s.assignment.id}`}>{s.assignment.title}</Link>
                          </td>
                          <td>№{s.number}</td>
                          <td>
                            {formatDateTime(s.submittedAt)}{' '}
                            {s.isLate && <span className="badge badge-warning">с опозданием</span>}
                          </td>
                          <td>{s.currentGrade ? `${s.currentGrade.score} из ${s.assignment.maxScore}` : '—'}</td>
                          <td>
                            <Link className="btn btn-small" href={`/submissions/${s.id}`}>
                              {s.currentGrade ? 'Открыть' : 'Оценить'}
                            </Link>
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
    </div>
  );
}
