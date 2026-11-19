import RequireAuth from '@/components/RequireAuth';
import CourseView from './CourseView';

export const metadata = { title: 'Курс — StudyTrack' };

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAuth>
      <CourseView courseId={id} />
    </RequireAuth>
  );
}
