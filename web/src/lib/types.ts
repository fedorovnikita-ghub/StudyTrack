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

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  archived: boolean;
  coursesCount: number;
  childrenCount: number;
  createdBy: string;
}

export type CourseStatus = 'active' | 'archived';

export interface Course {
  id: string;
  title: string;
  description: string;
  status: CourseStatus;
  version: number;
  category: { id: string; name: string };
  teacher: { id: string; displayName: string };
  createdAt: string;
  updatedAt: string;
}

export interface CourseDetails extends Course {
  isOwner: boolean;
  studentsCount: number | null;
}

export type EnrollmentStatus = 'active' | 'removed';

export interface Enrollment {
  id: string;
  courseId: string;
  student: { id: string; displayName: string; email: string };
  status: EnrollmentStatus;
  createdAt: string;
  removedAt: string | null;
  removeReason: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  teacher: 'Преподаватель',
  student: 'Студент',
};

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  active: 'Активный',
  archived: 'В архиве',
};
