'use client';

import Link from 'next/link';
import QueryView from '@/components/ui/QueryView';
import { formatDateTime, TIME_ZONE_LABEL } from '@/lib/format';
import { SUBMISSION_STATUS_LABELS, SubmissionDetails } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api-query';
import GradeForm from './GradeForm';
import GradeHistory from './GradeHistory';

export default function SubmissionView({ submissionId }: { submissionId: string }) {
  const submission = useApiQuery<SubmissionDetails>(`/submissions/${encodeURIComponent(submissionId)}`);

  return (
    <div className="stack">
      <QueryView query={submission} notFoundText="Работа не найдена или у вас нет к ней доступа">
        {(data) => (
          <>
            <p>
              <Link href={`/assignments/${data.assignment.id}`}>← {data.assignment.title}</Link>
            </p>
            <section className="card stack">
              <div className="page-head">
                <h1>Версия №{data.number}</h1>
                {data.isLate && <span className="badge badge-warning">Сдана с опозданием</span>}
              </div>
              <dl className="details">
                <dt>Курс</dt>
                <dd>
                  <Link href={`/courses/${data.course.id}`}>{data.course.title}</Link>
                </dd>
                <dt>Студент</dt>
                <dd>{data.student.displayName}</dd>
                <dt>Отправлена</dt>
                <dd>
                  {formatDateTime(data.submittedAt)} ({TIME_ZONE_LABEL})
                </dd>
                <dt>Срок задания</dt>
                <dd>{formatDateTime(data.assignment.dueAt)}</dd>
                <dt>Статус</dt>
                <dd>{SUBMISSION_STATUS_LABELS[data.status]}</dd>
                <dt>Оценка</dt>
                <dd>
                  {data.currentGrade
                    ? `${data.currentGrade.score} из ${data.assignment.maxScore} (${formatDateTime(data.currentGrade.gradedAt)})`
                    : 'еще не выставлена'}
                </dd>
              </dl>
            </section>
            <section className="card">
              <h2>Текст работы</h2>
              {/* Текст студента выводится как обычный текст, без HTML */}
              <div className="submission-text pre-wrap">{data.text}</div>
            </section>
            {data.isCourseOwner && (
              <GradeForm submission={data} onGraded={submission.reload} onReload={submission.reload} />
            )}
            <GradeHistory grades={data.grades} maxScore={data.assignment.maxScore} />
          </>
        )}
      </QueryView>
    </div>
  );
}
