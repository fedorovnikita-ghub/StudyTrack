import RequireAuth from '@/components/RequireAuth';
import SubmissionView from './SubmissionView';

export const metadata = { title: 'Работа — StudyTrack' };

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAuth>
      <SubmissionView submissionId={id} />
    </RequireAuth>
  );
}
