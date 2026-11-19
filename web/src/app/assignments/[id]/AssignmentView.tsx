'use client';

import Link from 'next/link';
import { useState } from 'react';
import QueryView from '@/components/ui/QueryView';
import { useAuth } from '@/lib/auth-context';
import { formatDateTime, TIME_ZONE_LABEL } from '@/lib/format';
import { AssignmentDetails } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api-query';
import MyVersions from './MyVersions';
import SubmissionsTable from './SubmissionsTable';
import SubmitForm from './SubmitForm';

export default function AssignmentView({ assignmentId }: { assignmentId: string }) {
  const { user } = useAuth();
  const assignment = useApiQuery<AssignmentDetails>(`/assignments/${encodeURIComponent(assignmentId)}`);
  // Увеличивается после успешной сдачи: история версий перечитывается с сервера
  const [versionsRefresh, setVersionsRefresh] = useState(0);

  return (
    <div className="stack">
      <QueryView query={assignment} notFoundText="Задание не найдено или у вас нет к нему доступа">
        {(data) => (
          <>
            <p>
              <Link href={`/courses/${data.course.id}`}>← {data.course.title}</Link>
            </p>
            <section className="card stack">
              <div className="page-head">
                <h1>{data.title}</h1>
                {data.isOverdue && <span className="badge badge-warning">Срок прошел</span>}
              </div>
              <dl className="details">
                <dt>Срок сдачи</dt>
                <dd>
                  {formatDateTime(data.dueAt)} ({TIME_ZONE_LABEL})
                </dd>
                <dt>Максимальный балл</dt>
                <dd>{data.maxScore}</dd>
                <dt>Версий на студента</dt>
                <dd>не более {data.settings.maxVersions}</dd>
                <dt>Минимальная длина работы</dt>
                <dd>{data.settings.minTextLength} симв.</dd>
              </dl>
              <p className="pre-wrap">{data.text}</p>
            </section>

            {user?.role === 'student' && (
              <>
                <SubmitForm assignment={data} onSubmitted={() => setVersionsRefresh((n) => n + 1)} />
                <MyVersions assignmentId={data.id} refreshKey={versionsRefresh} />
              </>
            )}
            {data.isOwner && <SubmissionsTable assignmentId={data.id} maxScore={data.maxScore} />}
          </>
        )}
      </QueryView>
    </div>
  );
}
