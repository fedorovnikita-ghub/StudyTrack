import RequireAuth from '@/components/RequireAuth';
import AssignmentView from './AssignmentView';

export const metadata = { title: 'Задание — StudyTrack' };

export default async function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAuth>
      <AssignmentView assignmentId={id} />
    </RequireAuth>
  );
}
