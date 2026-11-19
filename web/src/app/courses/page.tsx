import RequireAuth from '@/components/RequireAuth';
import CoursesList from './CoursesList';

export const metadata = { title: 'Мои курсы — StudyTrack' };

export default function CoursesPage() {
  return (
    <RequireAuth>
      <CoursesList />
    </RequireAuth>
  );
}
