import RequireAuth from '@/components/RequireAuth';
import Profile from './Profile';

export const metadata = { title: 'Личный кабинет — StudyTrack' };

export default function MePage() {
  return (
    <RequireAuth>
      <Profile />
    </RequireAuth>
  );
}
