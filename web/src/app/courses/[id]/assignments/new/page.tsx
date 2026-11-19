import RequireAuth from '@/components/RequireAuth';
import CreateAssignmentForm from './CreateAssignmentForm';

export const metadata = { title: 'Новое задание — StudyTrack' };

export default async function NewAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAuth roles={['teacher']}>
      <CreateAssignmentForm courseId={id} />
    </RequireAuth>
  );
}
