import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'StudyTrack — учет учебных заданий',
  description: 'Курсы, задания, сдача работ и оценки',
};

// Server Component: общий каркас страницы. Интерактивные части (шапка, формы) - клиентские
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AuthProvider>
          <SiteHeader />
          <main className="container">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
