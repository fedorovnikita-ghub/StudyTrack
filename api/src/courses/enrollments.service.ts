import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { AuthUser } from '../auth/auth.types';
import { AppError, conflict, notFound } from '../common/app-error';
import { isDuplicateKeyError } from '../common/mongo-errors';
import { Page, skipOf } from '../common/pagination';
import { searchRegex } from '../common/text';
import { Enrollment, ENROLLMENT_MODEL, EnrollmentStatus, User, USER_MODEL } from '../models';
import { CourseAccessService } from './course-access.service';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { EnrollmentListQueryDto } from './dto/enrollment-list-query.dto';
import { RemoveEnrollmentDto } from './dto/remove-enrollment.dto';

export interface EnrollmentResponse {
  id: string;
  courseId: string;
  student: { id: string; displayName: string; email: string };
  status: EnrollmentStatus;
  createdAt: string;
  removedAt: string | null;
  removeReason: string;
}

interface EnrollmentLike {
  _id: unknown;
  courseId: unknown;
  studentId: unknown;
  status: EnrollmentStatus;
  createdAt: Date;
  removedAt: Date | null;
  removeReason?: string;
}

interface StudentLike {
  _id: unknown;
  displayName: string;
  email: string;
}

function toEnrollmentResponse(e: EnrollmentLike, student: StudentLike | undefined): EnrollmentResponse {
  return {
    id: String(e._id),
    courseId: String(e.courseId),
    student: {
      id: String(e.studentId),
      displayName: student?.displayName ?? '',
      email: student?.email ?? '',
    },
    status: e.status,
    createdAt: e.createdAt.toISOString(),
    removedAt: e.removedAt ? e.removedAt.toISOString() : null,
    removeReason: e.removeReason ?? '',
  };
}

const MAX_SEARCH_MATCHES = 1000;

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectModel(ENROLLMENT_MODEL) private readonly enrollments: Model<Enrollment>,
    @InjectModel(USER_MODEL) private readonly users: Model<User>,
    private readonly access: CourseAccessService,
  ) {}

  async enroll(courseId: string, dto: EnrollStudentDto, user: AuthUser): Promise<EnrollmentResponse> {
    const course = await this.access.getOwnCourse(courseId, user);
    if (course.status !== 'active') {
      throw conflict('COURSE_ARCHIVED', 'Курс в архиве, зачисление невозможно');
    }

    const student = await this.users.findOne({ email: dto.email }).lean();
    if (!student || student.role !== 'student' || !student.active) {
      const message = 'Студент с таким email не найден';
      throw new AppError(404, 'STUDENT_NOT_FOUND', message, { email: message });
    }

    try {
      const enrollment = await this.enrollments.create({
        courseId: course._id,
        studentId: student._id,
        enrolledBy: user.id,
      });
      return toEnrollmentResponse(enrollment.toObject(), student);
    } catch (err) {
      // Уникальный частичный индекс: второе действующее зачисление невозможно даже при гонке
      if (isDuplicateKeyError(err)) {
        const message = 'Студент уже зачислен на этот курс';
        throw new AppError(409, 'ALREADY_ENROLLED', message, { email: message });
      }
      throw err;
    }
  }

  async list(courseId: string, query: EnrollmentListQueryDto, user: AuthUser): Promise<Page<EnrollmentResponse>> {
    await this.access.getOwnCourse(courseId, user);

    const filter: FilterQuery<Enrollment> = { courseId, status: query.status ?? 'active' };
    const regex = searchRegex(query.search);
    if (regex) {
      const matched = await this.users
        .find({ role: 'student', $or: [{ displayName: regex }, { email: regex }] })
        .select('_id')
        .limit(MAX_SEARCH_MATCHES)
        .lean();
      filter.studentId = { $in: matched.map((u) => u._id) };
    }

    const [items, total] = await Promise.all([
      this.enrollments.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skipOf(query)).limit(query.limit).lean(),
      this.enrollments.countDocuments(filter),
    ]);

    // Данные студентов одним запросом на всю страницу
    const students = await this.users
      .find({ _id: { $in: items.map((e) => e.studentId) } })
      .select('displayName email')
      .lean();
    const byId = new Map(students.map((s) => [String(s._id), s]));

    return {
      items: items.map((e) => toEnrollmentResponse(e, byId.get(String(e.studentId)))),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  // Отчисление: запись остается в истории со статусом removed, доступ к курсу закрывается сразу
  async remove(
    courseId: string,
    enrollmentId: string,
    dto: RemoveEnrollmentDto,
    user: AuthUser,
  ): Promise<EnrollmentResponse> {
    await this.access.getOwnCourse(courseId, user);

    const updated = await this.enrollments
      .findOneAndUpdate(
        { _id: enrollmentId, courseId, status: 'active' },
        { $set: { status: 'removed', removedAt: new Date(), removeReason: dto.reason } },
        { new: true },
      )
      .lean();

    if (!updated) {
      const existing = await this.enrollments.exists({ _id: enrollmentId, courseId });
      if (!existing) throw notFound('Зачисление не найдено');
      // Повторный запрос не меняет запись второй раз
      throw conflict('ALREADY_REMOVED', 'Студент уже отчислен с курса');
    }

    const student = await this.users.findById(updated.studentId).select('displayName email').lean();
    return toEnrollmentResponse(updated, student ?? undefined);
  }
}
