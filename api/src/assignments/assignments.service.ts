import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AuthUser } from '../auth/auth.types';
import { AppError, conflict, notFound } from '../common/app-error';
import { LIMITS } from '../common/limits';
import { Page, skipOf } from '../common/pagination';
import { searchRegex } from '../common/text';
import { CourseAccessService } from '../courses/course-access.service';
import {
  Assignment,
  ASSIGNMENT_MODEL,
  AssignmentSettings,
  AssignmentStatus,
  Submission,
  SUBMISSION_MODEL,
} from '../models';
import { AssignmentListQueryDto } from './dto/assignment-list-query.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

export interface AssignmentResponse {
  id: string;
  courseId: string;
  title: string;
  text: string;
  dueAt: string;
  maxScore: number;
  settings: AssignmentSettings;
  status: AssignmentStatus;
  isOverdue: boolean; // срок уже прошел
  createdAt: string;
  // Только для студента: краткая сводка его сдач
  my?: { submissionsCount: number; lastSubmittedAt: string | null };
}

export interface AssignmentDetailsResponse extends AssignmentResponse {
  course: { id: string; title: string };
  isOwner: boolean;
}

interface AssignmentLike {
  _id: unknown;
  courseId: unknown;
  title: string;
  text: string;
  dueAt: Date;
  maxScore: number;
  settings: AssignmentSettings;
  status: AssignmentStatus;
  createdAt: Date;
}

const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

function toAssignmentResponse(a: AssignmentLike, now = new Date()): AssignmentResponse {
  return {
    id: String(a._id),
    courseId: String(a.courseId),
    title: a.title,
    text: a.text,
    dueAt: a.dueAt.toISOString(),
    maxScore: a.maxScore,
    settings: {
      maxVersions: a.settings?.maxVersions ?? LIMITS.maxVersions.default,
      minTextLength: a.settings?.minTextLength ?? LIMITS.minTextLength.default,
    },
    status: a.status,
    isOverdue: now.getTime() > a.dueAt.getTime(),
    createdAt: a.createdAt.toISOString(),
  };
}

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectModel(ASSIGNMENT_MODEL) private readonly assignments: Model<Assignment>,
    @InjectModel(SUBMISSION_MODEL) private readonly submissions: Model<Submission>,
    private readonly access: CourseAccessService,
  ) {}

  async create(courseId: string, dto: CreateAssignmentDto, user: AuthUser): Promise<AssignmentResponse> {
    const course = await this.access.getOwnCourse(courseId, user);
    if (course.status !== 'active') {
      throw conflict('COURSE_ARCHIVED', 'Курс в архиве, новые задания добавить нельзя');
    }

    const dueAt = new Date(dto.dueAt);
    const now = Date.now();
    if (dueAt.getTime() <= now) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Проверьте срок сдачи', { dueAt: 'Срок должен быть в будущем' });
    }
    if (dueAt.getTime() > now + TWO_YEARS_MS) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Проверьте срок сдачи', { dueAt: 'Срок не дальше двух лет' });
    }

    const created = await this.assignments.create({
      courseId: course._id,
      title: dto.title,
      text: dto.text,
      dueAt,
      maxScore: dto.maxScore,
      settings: {
        maxVersions: dto.settings?.maxVersions ?? LIMITS.maxVersions.default,
        minTextLength: dto.settings?.minTextLength ?? LIMITS.minTextLength.default,
      },
      createdBy: user.id,
    });
    return toAssignmentResponse(created.toObject());
  }

  async list(courseId: string, query: AssignmentListQueryDto, user: AuthUser): Promise<Page<AssignmentResponse>> {
    await this.access.getAccessibleCourse(courseId, user);

    const filter: FilterQuery<Assignment> = { courseId, status: 'published' };
    const regex = searchRegex(query.search);
    if (regex) filter.title = regex;

    const [items, total] = await Promise.all([
      this.assignments.find(filter).sort({ dueAt: 1, _id: 1 }).skip(skipOf(query)).limit(query.limit).lean(),
      this.assignments.countDocuments(filter),
    ]);

    const now = new Date();
    const responses = items.map((a) => toAssignmentResponse(a, now));

    if (user.role === 'student' && items.length > 0) {
      // Сводка сдач студента по всем заданиям страницы - одним запросом
      const stats = await this.submissions.aggregate<{ _id: Types.ObjectId; count: number; last: Date }>([
        {
          $match: {
            assignmentId: { $in: items.map((a) => a._id) },
            studentId: new Types.ObjectId(user.id),
          },
        },
        { $group: { _id: '$assignmentId', count: { $sum: 1 }, last: { $max: '$submittedAt' } } },
      ]);
      const byId = new Map(stats.map((s) => [String(s._id), s]));
      for (const r of responses) {
        const s = byId.get(r.id);
        r.my = { submissionsCount: s?.count ?? 0, lastSubmittedAt: s ? s.last.toISOString() : null };
      }
    }

    return { items: responses, page: query.page, limit: query.limit, total };
  }

  async getOne(assignmentId: string, user: AuthUser): Promise<AssignmentDetailsResponse> {
    const { assignment, course } = await this.getAccessible(assignmentId, user);
    return {
      ...toAssignmentResponse(assignment),
      course: { id: String(course._id), title: course.title },
      isOwner: String(course.teacherId) === user.id,
    };
  }

  // Задание вместе с курсом, если у пользователя есть доступ к курсу. Иначе 404
  async getAccessible(assignmentId: string, user: AuthUser) {
    const assignment = await this.assignments.findById(assignmentId).lean();
    if (!assignment) {
      throw notFound('Задание не найдено');
    }
    try {
      const course = await this.access.getAccessibleCourse(String(assignment.courseId), user);
      return { assignment, course };
    } catch (err) {
      // Не раскрываем, что задание существует в чужом курсе. Остальные ошибки (например, 503) пробрасываем
      if (err instanceof AppError && err.getStatus() === 404) {
        throw notFound('Задание не найдено');
      }
      throw err;
    }
  }
}
