import RequireAuth from '@/components/RequireAuth';
import CategoriesManager from './CategoriesManager';

export const metadata = { title: 'Категории курсов — StudyTrack' };

export default function CategoriesPage() {
  return (
    <RequireAuth roles={['teacher']}>
      <CategoriesManager />
    </RequireAuth>
  );
}
