'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import Pagination from '@/components/ui/Pagination';
import QueryView from '@/components/ui/QueryView';
import SelectField from '@/components/ui/SelectField';
import { useAuth } from '@/lib/auth-context';
import { categoryOptions } from '@/lib/categories';
import { formatDate } from '@/lib/format';
import { LIMITS } from '@/lib/limits';
import { buildQuery } from '@/lib/query-string';
import { Category, Course, COURSE_STATUS_LABELS, Page } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api-query';

export default function CoursesList() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');

  const categories = useApiQuery<Page<Category>>('/categories?limit=100');
  const courses = useApiQuery<Page<Course>>(
    `/courses${buildQuery({ page, limit: LIMITS.pageLimit, search, categoryId, status })}`,
  );

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  }

  const options = categoryOptions(categories.data?.items ?? []).map((o) => ({ value: o.id, label: o.label }));

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Мои курсы</h1>
        {isTeacher && (
          <Link className="btn btn-primary" href="/courses/new">
            Создать курс
          </Link>
        )}
      </div>

      <form className="card filters" onSubmit={handleSearch} role="search">
        <div className="field">
          <label htmlFor="course-search">Поиск по названию</label>
          <div className="search-row">
            <input
              id="course-search"
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              maxLength={LIMITS.search.max}
            />
            <button type="submit" className="btn">
              Найти
            </button>
          </div>
        </div>
        <SelectField
          label="Категория"
          name="categoryId"
          value={categoryId}
          onChange={(value) => {
            setCategoryId(value);
            setPage(1);
          }}
          placeholder="Все категории"
          options={options}
        />
        {isTeacher && (
          <SelectField
            label="Статус"
            name="status"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            placeholder="Все"
            options={[
              { value: 'active', label: COURSE_STATUS_LABELS.active },
              { value: 'archived', label: COURSE_STATUS_LABELS.archived },
            ]}
          />
        )}
      </form>

      <QueryView query={courses}>
        {(data) =>
          data.items.length === 0 ? (
            <div className="card empty">
              {search || categoryId || status ? (
                <p>По заданным условиям курсов не найдено.</p>
              ) : isTeacher ? (
                <p>
                  У вас пока нет курсов. <Link href="/courses/new">Создайте первый курс</Link>.
                </p>
              ) : (
                <p>Вас пока не зачислили ни на один курс. Обратитесь к преподавателю.</p>
              )}
            </div>
          ) : (
            <>
              <ul className="card-list">
                {data.items.map((course) => (
                  <li key={course.id} className="card course-card">
                    <div className="course-card__head">
                      <h2>
                        <Link href={`/courses/${course.id}`}>{course.title}</Link>
                      </h2>
                      {course.status === 'archived' && <span className="badge">{COURSE_STATUS_LABELS.archived}</span>}
                    </div>
                    <p className="muted">
                      {course.category.name} · {course.teacher.displayName} · создан {formatDate(course.createdAt)}
                    </p>
                    {course.description && <p className="clamp">{course.description}</p>}
                  </li>
                ))}
              </ul>
              <Pagination page={data.page} limit={data.limit} total={data.total} onChange={setPage} />
            </>
          )
        }
      </QueryView>
    </div>
  );
}
