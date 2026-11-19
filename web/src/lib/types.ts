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

export interface AssignmentSettings {
  maxVersions: number;
  minTextLength: number;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  text: string;
  dueAt: string;
  maxScore: number;
  settings: AssignmentSettings;
  status: 'published' | 'archived';
  isOverdue: boolean;
  createdAt: string;
  my?: { submissionsCount: number; lastSubmittedAt: string | null };
}

export interface AssignmentDetails extends Assignment {
  course: { id: string; title: string };
  isOwner: boolean;
}

export type SubmissionStatus = 'submitted' | 'graded';

export interface Submission {
  id: string;
  assignmentId: string;
  courseId: string;
  student: { id: string; displayName: string };
  number: number;
  textPreview: string;
  submittedAt: string;
  isLate: boolean;
  status: SubmissionStatus;
  currentGrade: { score: number; gradedAt: string; gradedBy: { id: string; displayName: string } } | null;
  version: number;
}

export interface GradeEntry {
  id: string;
  score: number;
  comment: string;
  gradedBy: { id: string; displayName: string };
  gradedAt: string;
}

export interface SubmissionDetails extends Submission {
  text: string;
  grades: GradeEntry[];
  assignment: { id: string; title: string; maxScore: number; dueAt: string };
  course: { id: string; title: string };
  isCourseOwner: boolean;
}

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  submitted: 'Ожидает оценки',
  graded: 'Оценена',
};

export interface QueueItem extends Submission {
  assignment: { id: string; title: string; maxScore: number };
  course: { id: string; title: string };
}

export interface AssignmentResult {
  assignment: { id: string; title: string; maxScore: number; dueAt: string; isOverdue: boolean };
  versionsCount: number;
  lastSubmittedAt: string | null;
  hasLate: boolean;
  currentScore: number | null;
  gradedVersion: number | null;
}

export interface CourseResult {
  course: { id: string; title: string };
  assignments: AssignmentResult[];
  totalScore: number;
  maxTotal: number;
  gradedCount: number;
  assignmentsCount: number;
  percent: number | null;
}

export interface ReportAssignmentRow {
  id: string;
  title: string;
  dueAt: string;
  maxScore: number;
  isOverdue: boolean;
  enrolled: number;
  submitted: number;
  onTime: number;
  lateOnly: number;
  notSubmitted: number;
  missed: number;
  submissionRate: number | null;
}

export interface ReportStudentRow {
  studentId: string;
  displayName: string;
  totalScore: number;
  maxTotal: number;
  percent: number | null;
  gradedCount: number;
  lateOnlyCount: number;
  missedCount: number;
}

export interface CourseReport {
  course: { id: string; title: string };
  period: { from: string; to: string };
  generatedAt: string;
  assignments: ReportAssignmentRow[];
  students: ReportStudentRow[];
  totals: {
    assignments: number;
    enrolled: number;
    expected: number;
    submitted: number;
    onTime: number;
    lateOnly: number;
    notSubmitted: number;
    missed: number;
    submissionRate: number | null;
    averagePercent: number | null;
  };
}

export interface SummaryReport {
  period: { from: string; to: string };
  factsCount: number;
  items: {
    assignment: { id: string; title: string; maxScore: number; dueAt: string };
    count: number;
    total: number;
    average: number | null;
    averagePercent: number | null;
  }[];
}
