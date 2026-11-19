import RequireAuth from '@/components/RequireAuth';
import ReportView from './ReportView';

export const metadata = { title: 'Отчет курса — StudyTrack' };

export default async function CourseReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAuth roles={['teacher']}>
      <ReportView courseId={id} />
    </RequireAuth>
  );
}
