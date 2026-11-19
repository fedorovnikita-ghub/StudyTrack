'use client';

import { FormEvent, useState } from 'react';
import Alert from '@/components/ui/Alert';
import ConfirmAction from '@/components/ui/ConfirmAction';
import Pagination from '@/components/ui/Pagination';
import QueryView from '@/components/ui/QueryView';
import TextField from '@/components/ui/TextField';
import { ApiError, FieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatDateTime } from '@/lib/format';
import { LIMITS } from '@/lib/limits';
import { buildQuery } from '@/lib/query-string';
import { Enrollment, EnrollmentStatus, Page } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api-query';

interface EnrollmentsPanelProps {
  courseId: string;
  onChanged: () => void;
}

export default function EnrollmentsPanel({ courseId, onChanged }: EnrollmentsPanelProps) {
  const { request } = useAuth();

  const [status, setStatus] = useState<EnrollmentStatus>('active');
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');

  const [email, setEmail] = useState('');
  const [fields, setFields] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const enrollments = useApiQuery<Page<Enrollment>>(
    `/courses/${courseId}/enrollments${buildQuery({ status, page, limit: LIMITS.pageLimit, search })}`,
  );

  async function handleEnroll(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setFormError(null);
    setSuccess(null);
    if (!email.trim()) {
      setFields({ email: 'Укажите email студента' });
      return;
    }
    setFields({});

    setPending(true);
    try {
      const created = await request<Enrollment>(`/courses/${courseId}/enrollments`, {
        method: 'POST',
        body: { email: email.trim() },
      });
      setSuccess(`${created.student.displayName} зачислен(а) на курс`);
      setEmail('');
      enrollments.reload();
      onChanged();
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setFormError(Object.keys(err.fields).length > 0 ? null : err.message);
      } else {
        setFormError('Не удалось зачислить студента');
      }
    } finally {
      setPending(false);
    }
  }

  async function removeStudent(enrollment: Enrollment, reason: string) {
    await request(`/courses/${courseId}/enrollments/${enrollment.id}/remove`, {
      method: 'POST',
      body: { reason },
    });
    enrollments.reload();
    onChanged();
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  }

  return (
    <section className="card stack">
      <h2>Студенты курса</h2>

      <form className="form form-inline" onSubmit={handleEnroll} noValidate>
        <TextField
          label="Зачислить студента по email"
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
          error={fields.email}
          hint="Студент должен быть зарегистрирован на сайте"
          maxLength={LIMITS.email.max}
        />
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Зачисляем…' : 'Зачислить'}
        </button>
      </form>
      {formError && <Alert kind="error">{formError}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      <div className="filters-row">
        <div className="tabs" role="tablist" aria-label="Статус зачисления">
          {(['active', 'removed'] as const).map((s) => (
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
              {s === 'active' ? 'Зачисленные' : 'Отчисленные'}
            </button>
          ))}
        </div>
        <form className="search-row" onSubmit={handleSearch} role="search">
          <label htmlFor="enrollment-search" className="visually-hidden">
            Поиск по имени или email
          </label>
          <input
            id="enrollment-search"
            type="search"
            placeholder="Имя или email"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            maxLength={LIMITS.search.max}
          />
          <button type="submit" className="btn btn-small">
            Найти
          </button>
        </form>
      </div>

      <QueryView query={enrollments}>
        {(data) =>
          data.items.length === 0 ? (
            <p className="muted">{search ? 'Никого не найдено.' : 'Список пуст.'}</p>
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Студент</th>
                      <th scope="col">Email</th>
                      <th scope="col">{status === 'active' ? 'Зачислен' : 'Отчислен'}</th>
                      {status === 'removed' && <th scope="col">Причина</th>}
                      {status === 'active' && <th scope="col">Действие</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((e) => (
                      <tr key={e.id}>
                        <td>{e.student.displayName}</td>
                        <td>{e.student.email}</td>
                        <td>{formatDateTime(status === 'active' ? e.createdAt : e.removedAt)}</td>
                        {status === 'removed' && <td>{e.removeReason}</td>}
                        {status === 'active' && (
                          <td>
                            <ConfirmAction
                              buttonLabel="Отчислить"
                              question={`Отчислить ${e.student.displayName}? Студент сразу потеряет доступ к курсу, его работы и оценки сохранятся.`}
                              confirmLabel="Отчислить"
                              requireReason
                              danger
                              onConfirm={(reason) => removeStudent(e, reason)}
                            />
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
