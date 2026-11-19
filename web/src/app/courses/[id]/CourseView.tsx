'use client';

import Link from 'next/link';
import QueryView from '@/components/ui/QueryView';
import { formatDateTime, TIME_ZONE_LABEL } from '@/lib/format';
import { COURSE_STATUS_LABELS, CourseDetails } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api-query';
import AssignmentsSection from './AssignmentsSection';
import EditCourseForm from './EditCourseForm';
import EnrollmentsPanel from './EnrollmentsPanel';

export default function CourseView({ courseId }: { courseId: string }) {
  const course = useApiQuery<CourseDetails>(`/courses/${encodeURIComponent(courseId)}`);

  return (
    <div className="stack">
      <p>
        <Link href="/courses">← Мои курсы</Link>
      </p>
      <QueryView query={course} notFoundText="Курс не найден или у вас нет к нему доступа">
        {(data) => (
          <>
            <section className="card stack">
              <div className="page-head">
                <h1>{data.title}</h1>
                <span className={data.status === 'active' ? 'badge badge-success' : 'badge'}>
                  {COURSE_STATUS_LABELS[data.status]}
                </span>
              </div>
              <dl className="details">
                <dt>Категория</dt>
                <dd>{data.category.name}</dd>
                <dt>Преподаватель</dt>
                <dd>{data.teacher.displayName}</dd>
                <dt>Изменен</dt>
                <dd>
                  {formatDateTime(data.updatedAt)} ({TIME_ZONE_LABEL})
                </dd>
                {data.studentsCount !== null && (
                  <>
                    <dt>Студентов</dt>
                    <dd>{data.studentsCount}</dd>
                  </>
                )}
              </dl>
              {data.isOwner && (
                <p>
                  <Link className="btn" href={`/courses/${data.id}/report`}>
                    Отчет курса
                  </Link>
                </p>
              )}
              {/* Текст выводится как обычный текст: React экранирует HTML */}
              {data.description ? <p className="pre-wrap">{data.description}</p> : <p className="muted">Описания нет.</p>}
            </section>

            <AssignmentsSection courseId={data.id} isOwner={data.isOwner} courseActive={data.status === 'active'} />
            {data.isOwner && <EditCourseForm course={data} onSaved={course.reload} onReload={course.reload} />}
            {data.isOwner && <EnrollmentsPanel courseId={data.id} onChanged={course.reload} />}
          </>
        )}
      </QueryView>
    </div>
  );
}
