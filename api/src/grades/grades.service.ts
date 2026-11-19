import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, FilterQuery, Model, Types } from 'mongoose';
import { AssignmentsService } from '../assignments/assignments.service';
import { AuthUser } from '../auth/auth.types';
import { AppError, conflict, notFound } from '../common/app-error';
import { loadNames } from '../common/names';
import { Page, PageQueryDto, skipOf } from '../common/pagination';
import { CourseAccessService } from '../courses/course-access.service';
import { withTransaction } from '../database/transaction';
import {
  Assignment,
  ASSIGNMENT_MODEL,
  Course,
  COURSE_MODEL,
  Enrollment,
  ENROLLMENT_MODEL,
  Grade,
  GRADE_MODEL,
  Submission,
  SUBMISSION_MODEL,
  User,
  USER_MODEL,
} from '../models';
import { RealtimeService } from '../realtime/realtime.service';
import { SubmissionResponse, toSubmissionResponse } from '../submissions/submissions.service';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { GradingQueueQueryDto } from './dto/grading-queue-query.dto';
import { currentResult, isValidScore, percentOf } from './grade-rules';

export interface QueueItem extends SubmissionResponse {
  assignment: { id: string; title: string; maxScore: number };
  course: { id: string; title: string };
}

export interface AssignmentResult {
  assignment: { id: string; title: string; maxScore: number; dueAt: string; isOverdue: boolean };
  versionsCount: number;
  lastSubmittedAt: string | null;
  hasLate: boolean; // хотя бы одна версия сдана с опозданием
  currentScore: number | null; // оценка последней оцененной версии
  gradedVersion: number | null;
}

export interface CourseResult {
  course: { id: string; title: string };
  assignments: AssignmentResult[];
  totalScore: number; // сумма текущих оценок
  maxTotal: number; // сумма максимальных баллов всех заданий курса
  gradedCount: number;
  assignmentsCount: number;
  percent: number | null;
}

// Ограничения объема для расчета личных результатов
const MAX_TEACHER_COURSES = 500;
const MAX_ASSIGNMENTS_PER_PAGE = 2000;

@Injectable()
export class GradesService {
  private readonly logger = new Logger('Grades');

  constructor(
    @InjectModel(SUBMISSION_MODEL) private readonly submissions: Model<Submission>,
    @InjectModel(GRADE_MODEL) private readonly grades: Model<Grade>,
    @InjectModel(COURSE_MODEL) private readonly courses: Model<Course>,
    @InjectModel(ASSIGNMENT_MODEL) private readonly assignments: Model<Assignment>,
    @InjectModel(ENROLLMENT_MODEL) private readonly enrollments: Model<Enrollment>,
    @InjectModel(USER_MODEL) private readonly users: Model<User>,
    @InjectConnection() private readonly connection: Connection,
    private readonly assignmentsService: AssignmentsService,
    private readonly access: CourseAccessService,
    private readonly realtime: RealtimeService,
  ) {}

  // Оценка конкретной версии. Оценка и ее дата записываются в одной транзакции:
  //   1) условное обновление версии работы по version (+1) и запись currentGrade
  //   2) новый документ в grades - история оценок
  async grade(submissionId: string, dto: GradeSubmissionDto, user: AuthUser): Promise<SubmissionResponse> {
    const submission = await this.submissions.findById(submissionId).lean();
    if (!submission) {
      throw notFound('Работа не найдена');
    }
    // Для преподавателя доступ = владение курсом. Чужой курс - 404
    const { assignment } = await this.assignmentsService.getAccessible(String(submission.assignmentId), user);

    if (!isValidScore(dto.score, assignment.maxScore)) {
      const message = `Балл - целое число от 0 до ${assignment.maxScore}`;
      throw new AppError(400, 'VALIDATION_ERROR', message, { score: message });
    }

    const gradeId = new Types.ObjectId();
    const updated = await withTransaction(this.connection, async (session) => {
      const gradedAt = new Date();

      const doc = await this.submissions.findOneAndUpdate(
        { _id: submission._id, version: dto.version },
        {
          $set: {
            status: 'graded',
            currentGrade: { gradeId, score: dto.score, gradedBy: user.id, gradedAt },
          },
          $inc: { version: 1 },
        },
        { session, new: true },
      );
      if (!doc) {
        // Работу уже оценили в другом окне: повторный или устаревший запрос не меняет результат
        throw conflict('VERSION_CONFLICT', 'Работу уже оценили в другом окне. Обновите данные и проверьте оценку');
      }

      await this.grades.create(
        [
          {
            _id: gradeId,
            submissionId: submission._id,
            assignmentId: submission.assignmentId,
            courseId: submission.courseId,
            studentId: submission.studentId,
            score: dto.score,
            comment: dto.comment ?? '',
            gradedBy: user.id,
            gradedAt,
          },
        ],
        { session },
      );
      return doc.toObject();
    });

    void this.notifyGradeChanged(updated, user.id);

    const names = await loadNames(this.users, [updated.studentId, user.id], 'displayName');
    return toSubmissionResponse(updated, names.get(String(updated.studentId)) ?? '', names);
  }

  // grade.changed - только владельцу работы (если он все еще зачислен) и преподавателю
  private async notifyGradeChanged(
    s: { _id: unknown; assignmentId: unknown; courseId: unknown; studentId: unknown },
    teacherId: string,
  ): Promise<void> {
    try {
      const studentId = String(s.studentId);
      const recipients = [teacherId];
      if (await this.access.isEnrolled(String(s.courseId), studentId)) {
        recipients.push(studentId);
      }
      await this.realtime.notify(
        {
          type: 'grade.changed',
          submissionId: String(s._id),
          assignmentId: String(s.assignmentId),
          courseId: String(s.courseId),
          studentId,
        },
        recipients,
      );
    } catch (err) {
      this.logger.warn(`Событие grade.changed не отправлено: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Кабинет оценивания: работы во всех курсах преподавателя, старые сверху
  async queue(query: GradingQueueQueryDto, user: AuthUser): Promise<Page<QueueItem>> {
    const ownCourses = await this.courses
      .find(query.courseId ? { _id: query.courseId, teacherId: user.id } : { teacherId: user.id })
      .select('_id title')
      .limit(MAX_TEACHER_COURSES)
      .lean();

    const filter: FilterQuery<Submission> = {
      courseId: { $in: ownCourses.map((c) => c._id) },
      status: query.status ?? 'submitted',
    };

    const [items, total] = await Promise.all([
      this.submissions.find(filter).sort({ submittedAt: 1, _id: 1 }).skip(skipOf(query)).limit(query.limit).lean(),
      this.submissions.countDocuments(filter),
    ]);

    const assignmentList = await this.assignments
      .find({ _id: { $in: items.map((s) => s.assignmentId) } })
      .select('title maxScore')
      .lean();
    const assignmentsById = new Map(assignmentList.map((a) => [String(a._id), a]));
    const courseTitles = new Map(ownCourses.map((c) => [String(c._id), c.title]));
    const names = await loadNames(
      this.users,
      [...items.map((s) => s.studentId), ...items.map((s) => s.currentGrade?.gradedBy)],
      'displayName',
    );

    return {
      items: items.map((s) => {
        const a = assignmentsById.get(String(s.assignmentId));
        return {
          ...toSubmissionResponse(s, names.get(String(s.studentId)) ?? '', names),
          assignment: { id: String(s.assignmentId), title: a?.title ?? '', maxScore: a?.maxScore ?? 0 },
          course: { id: String(s.courseId), title: courseTitles.get(String(s.courseId)) ?? '' },
        };
      }),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  // Личные результаты студента по его курсам (страница = курсы).
  // Объем ограничен одной страницей курсов, поэтому расчет идет в JavaScript по уже выбранным данным
  async myResults(query: PageQueryDto, user: AuthUser): Promise<Page<CourseResult>> {
    const enrollmentFilter = { studentId: user.id, status: 'active' as const };
    const [enrollments, total] = await Promise.all([
      this.enrollments
        .find(enrollmentFilter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skipOf(query))
        .limit(query.limit)
        .select('courseId')
        .lean(),
      this.enrollments.countDocuments(enrollmentFilter),
    ]);
    const courseIds = enrollments.map((e) => e.courseId);

    const [courseList, assignmentList] = await Promise.all([
      this.courses.find({ _id: { $in: courseIds } }).select('title').lean(),
      this.assignments
        .find({ courseId: { $in: courseIds }, status: 'published' })
        .sort({ dueAt: 1, _id: 1 })
        .limit(MAX_ASSIGNMENTS_PER_PAGE)
        .select('courseId title maxScore dueAt')
        .lean(),
    ]);

    const mySubmissions = await this.submissions
      .find({ studentId: user.id, assignmentId: { $in: assignmentList.map((a) => a._id) } })
      .select('assignmentId number isLate submittedAt currentGrade.score')
      .lean();

    const subsByAssignment = new Map<string, typeof mySubmissions>();
    for (const s of mySubmissions) {
      const key = String(s.assignmentId);
      const list = subsByAssignment.get(key) ?? [];
      list.push(s);
      subsByAssignment.set(key, list);
    }

    const now = Date.now();
    const titles = new Map(courseList.map((c) => [String(c._id), c.title]));

    const items: CourseResult[] = courseIds.map((courseId) => {
      const rows: AssignmentResult[] = assignmentList
        .filter((a) => String(a.courseId) === String(courseId))
        .map((a) => {
          const subs = subsByAssignment.get(String(a._id)) ?? [];
          const result = currentResult(subs.map((s) => ({ number: s.number, score: s.currentGrade?.score ?? null })));
          const last = subs.reduce<Date | null>((max, s) => (!max || s.submittedAt > max ? s.submittedAt : max), null);
          return {
            assignment: {
              id: String(a._id),
              title: a.title,
              maxScore: a.maxScore,
              dueAt: a.dueAt.toISOString(),
              isOverdue: now > a.dueAt.getTime(),
            },
            versionsCount: subs.length,
            lastSubmittedAt: last ? last.toISOString() : null,
            hasLate: subs.some((s) => s.isLate),
            currentScore: result?.score ?? null,
            gradedVersion: result?.number ?? null,
          };
        });

      const totalScore = rows.reduce((sum, r) => sum + (r.currentScore ?? 0), 0);
      const maxTotal = rows.reduce((sum, r) => sum + r.assignment.maxScore, 0);
      return {
        course: { id: String(courseId), title: titles.get(String(courseId)) ?? '' },
        assignments: rows,
        totalScore,
        maxTotal,
        gradedCount: rows.filter((r) => r.currentScore !== null).length,
        assignmentsCount: rows.length,
        percent: percentOf(totalScore, maxTotal),
      };
    });

    return { items, page: query.page, limit: query.limit, total };
  }
}
