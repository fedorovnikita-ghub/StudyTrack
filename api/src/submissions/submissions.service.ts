import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, FilterQuery, Model } from 'mongoose';
import { AssignmentsService } from '../assignments/assignments.service';
import { AuthUser } from '../auth/auth.types';
import { AppError, conflict, notFound } from '../common/app-error';
import { isDuplicateKeyError } from '../common/mongo-errors';
import { loadNames } from '../common/names';
import { Page, skipOf } from '../common/pagination';
import { CourseAccessService } from '../courses/course-access.service';
import { withTransaction } from '../database/transaction';
import { RealtimeService } from '../realtime/realtime.service';
import {
  CurrentGrade,
  Enrollment,
  ENROLLMENT_MODEL,
  Grade,
  GRADE_MODEL,
  Submission,
  SUBMISSION_MODEL,
  SubmissionStatus,
  User,
  USER_MODEL,
} from '../models';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionListQueryDto } from './dto/submission-list-query.dto';
import { canSubmitVersion, isLateSubmission, nextVersionNumber, submissionTextLength } from './submission-rules';

const PREVIEW_LENGTH = 200;
const MAX_GRADE_HISTORY = 50;

export interface SubmissionResponse {
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

export interface GradeResponse {
  id: string;
  score: number;
  comment: string;
  gradedBy: { id: string; displayName: string };
  gradedAt: string;
}

export interface SubmissionDetailsResponse extends SubmissionResponse {
  text: string;
  grades: GradeResponse[]; // история оценок этой версии, новые сверху
  assignment: { id: string; title: string; maxScore: number; dueAt: string };
  course: { id: string; title: string };
  isCourseOwner: boolean;
}

export interface SubmissionLike {
  _id: unknown;
  assignmentId: unknown;
  courseId: unknown;
  studentId: unknown;
  number: number;
  text: string;
  submittedAt: Date;
  isLate: boolean;
  status: SubmissionStatus;
  currentGrade?: CurrentGrade | null;
  version: number;
}

function preview(text: string): string {
  const clean = text.trim();
  return clean.length > PREVIEW_LENGTH ? `${clean.slice(0, PREVIEW_LENGTH)}…` : clean;
}

export function toSubmissionResponse(
  s: SubmissionLike,
  studentName: string,
  names: Map<string, string> | null,
): SubmissionResponse {
  const grade = s.currentGrade;
  return {
    id: String(s._id),
    assignmentId: String(s.assignmentId),
    courseId: String(s.courseId),
    student: { id: String(s.studentId), displayName: studentName },
    number: s.number,
    textPreview: preview(s.text),
    submittedAt: s.submittedAt.toISOString(),
    isLate: s.isLate,
    status: s.status,
    currentGrade: grade
      ? {
          score: grade.score,
          gradedAt: grade.gradedAt.toISOString(),
          gradedBy: { id: String(grade.gradedBy), displayName: names?.get(String(grade.gradedBy)) ?? '' },
        }
      : null,
    version: s.version,
  };
}

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(SUBMISSION_MODEL) private readonly submissions: Model<Submission>,
    @InjectModel(ENROLLMENT_MODEL) private readonly enrollments: Model<Enrollment>,
    @InjectModel(USER_MODEL) private readonly users: Model<User>,
    @InjectModel(GRADE_MODEL) private readonly grades: Model<Grade>,
    @InjectConnection() private readonly connection: Connection,
    private readonly assignments: AssignmentsService,
    private readonly access: CourseAccessService,
    private readonly realtime: RealtimeService,
  ) {}

  // Ключевая операция: сдача новой версии работы.
  // Порядок: проверка формата (DTO) -> доступ -> состояние -> транзакция:
  //   1) +1 к guardVersion зачисления студента (общий документ для всех его сдач)
  //   2) следующий номер версии
  //   3) вставка версии
  async create(assignmentId: string, dto: CreateSubmissionDto, user: AuthUser): Promise<SubmissionResponse> {
    const { assignment, course } = await this.assignments.getAccessible(assignmentId, user);

    if (assignment.status !== 'published') {
      throw conflict('ASSIGNMENT_CLOSED', 'Задание закрыто для сдачи');
    }
    if (course.status !== 'active') {
      throw conflict('COURSE_ARCHIVED', 'Курс в архиве, сдача работ закрыта');
    }

    const minLength = assignment.settings?.minTextLength ?? 1;
    if (submissionTextLength(dto.text) < minLength) {
      const message = `Текст работы не короче ${minLength} символов`;
      throw new AppError(400, 'VALIDATION_ERROR', message, { text: message });
    }
    const maxVersions = assignment.settings?.maxVersions ?? 20;

    try {
      const created = await withTransaction(this.connection, async (session) => {
        // Две одновременные сдачи одного студента меняют этот документ - одна транзакция
        // получит конфликт записи и будет повторена драйвером, уже увидев первую версию
        const enrollment = await this.enrollments.findOneAndUpdate(
          { courseId: assignment.courseId, studentId: user.id, status: 'active' },
          { $inc: { guardVersion: 1 } },
          { session, new: true },
        );
        if (!enrollment) {
          // Студента отчислили между проверкой доступа и сдачей
          throw notFound('Задание не найдено');
        }

        const last = await this.submissions
          .findOne({ assignmentId: assignment._id, studentId: user.id })
          .sort({ number: -1 })
          .select('number')
          .session(session)
          .lean();

        const number = nextVersionNumber(last?.number);
        if (!canSubmitVersion(number, maxVersions)) {
          throw conflict('MAX_VERSIONS_REACHED', `Достигнут предел версий для этого задания: ${maxVersions}`);
        }

        const submittedAt = new Date();
        const [doc] = await this.submissions.create(
          [
            {
              assignmentId: assignment._id,
              courseId: assignment.courseId,
              studentId: user.id,
              number,
              text: dto.text.trim(),
              submittedAt,
              isLate: isLateSubmission(submittedAt, assignment.dueAt),
            },
          ],
          { session },
        );
        return doc.toObject();
      });

      // Событие - только после успешной транзакции: автору и преподавателю курса
      void this.realtime.notify(
        {
          type: 'submission.created',
          submissionId: String(created._id),
          assignmentId: String(created.assignmentId),
          courseId: String(created.courseId),
          studentId: user.id,
        },
        [user.id, String(course.teacherId)],
      );

      return toSubmissionResponse(created, user.displayName, null);
    } catch (err) {
      // Вторая линия защиты: уникальный индекс номера версии
      if (isDuplicateKeyError(err)) {
        throw conflict('SUBMISSION_CONFLICT', 'Работа отправляется одновременно из другого окна. Обновите страницу');
      }
      throw err;
    }
  }

  // Студент видит только свои версии, преподаватель-владелец - все работы задания
  async list(assignmentId: string, query: SubmissionListQueryDto, user: AuthUser): Promise<Page<SubmissionResponse>> {
    const { assignment } = await this.assignments.getAccessible(assignmentId, user);

    const filter: FilterQuery<Submission> = { assignmentId: assignment._id };
    let sort: Record<string, 1 | -1>;

    if (user.role === 'student') {
      filter.studentId = user.id;
      sort = { number: -1 };
    } else {
      if (query.status) filter.status = query.status;
      if (query.studentId) filter.studentId = query.studentId;
      sort = { submittedAt: -1, _id: -1 };
    }

    const [items, total] = await Promise.all([
      this.submissions.find(filter).sort(sort).skip(skipOf(query)).limit(query.limit).lean(),
      this.submissions.countDocuments(filter),
    ]);

    const names = await loadNames(
      this.users,
      [...items.map((s) => s.studentId), ...items.map((s) => s.currentGrade?.gradedBy)],
      'displayName',
    );

    return {
      items: items.map((s) => toSubmissionResponse(s, names.get(String(s.studentId)) ?? '', names)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  // Полный текст версии: автору (если он все еще зачислен) или преподавателю курса. Иначе 404
  async getOne(submissionId: string, user: AuthUser): Promise<SubmissionDetailsResponse> {
    const submission = await this.submissions.findById(submissionId).lean();
    if (!submission) {
      throw notFound('Работа не найдена');
    }
    if (user.role === 'student' && String(submission.studentId) !== user.id) {
      throw notFound('Работа не найдена');
    }

    const { assignment, course } = await this.assignments.getAccessible(String(submission.assignmentId), user);

    const grades = await this.grades
      .find({ submissionId: submission._id })
      .sort({ gradedAt: -1, _id: -1 })
      .limit(MAX_GRADE_HISTORY)
      .lean();

    const names = await loadNames(
      this.users,
      [submission.studentId, submission.currentGrade?.gradedBy, ...grades.map((g) => g.gradedBy)],
      'displayName',
    );
    return {
      ...toSubmissionResponse(submission, names.get(String(submission.studentId)) ?? '', names),
      text: submission.text,
      grades: grades.map((g) => ({
        id: String(g._id),
        score: g.score,
        comment: g.comment,
        gradedBy: { id: String(g.gradedBy), displayName: names.get(String(g.gradedBy)) ?? '' },
        gradedAt: g.gradedAt.toISOString(),
      })),
      assignment: {
        id: String(assignment._id),
        title: assignment.title,
        maxScore: assignment.maxScore,
        dueAt: assignment.dueAt.toISOString(),
      },
      course: { id: String(course._id), title: course.title },
      isCourseOwner: String(course.teacherId) === user.id,
    };
  }
}
