import RequireAuth from '@/components/RequireAuth';
import Overview from './Overview';

export const metadata = { title: 'Обзор курсов (GraphQL) — StudyTrack' };

export default function OverviewPage() {
  return (
    <RequireAuth>
      <Overview />
    </RequireAuth>
  );
}
