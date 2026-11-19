import RequireAuth from '@/components/RequireAuth';
import MyResults from './MyResults';

export const metadata = { title: 'Мои результаты — StudyTrack' };

export default function ResultsPage() {
  return (
    <RequireAuth roles={['student']}>
      <MyResults />
    </RequireAuth>
  );
}
