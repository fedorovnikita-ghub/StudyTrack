export type UserRole = 'teacher' | 'student';

export interface User {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
}

export interface Session {
  token: string;
  expiresAt: string;
  user: User;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  teacher: 'Преподаватель',
  student: 'Студент',
};
