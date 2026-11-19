import RequireAuth from '@/components/RequireAuth';
import CreateCourseForm from './CreateCourseForm';

export const metadata = { title: 'Новый курс — StudyTrack' };

export default function NewCoursePage() {
  return (
    <RequireAuth roles={['teacher']}>
      <CreateCourseForm />
    </RequireAuth>
  );
}
