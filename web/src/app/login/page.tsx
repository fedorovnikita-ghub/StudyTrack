import { safeNextPath } from '@/lib/navigation';
import LoginForm from './LoginForm';

export const metadata = { title: 'Вход — StudyTrack' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginForm nextPath={safeNextPath(next)} />;
}
