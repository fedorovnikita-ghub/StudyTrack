import RequireAuth from '@/components/RequireAuth';
import GradingQueue from './GradingQueue';

export const metadata = { title: 'Кабинет оценивания — StudyTrack' };

export default function GradingPage() {
  return (
    <RequireAuth roles={['teacher']}>
      <GradingQueue />
    </RequireAuth>
  );
}
