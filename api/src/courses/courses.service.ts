import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, FilterQuery, Model } from 'mongoose';
import { AuthUser } from '../auth/auth.types';
import { CacheService } from '../cache/cache.service';
import { AppError, conflict, notFound, validationError } from '../common/app-error';
import { loadNames } from '../common/names';
import { Page, skipOf } from '../common/pagination';
import { searchRegex } from '../common/text';
import { withTransaction } from '../database/transaction';
import {
  Category,
  CATEGORY_MODEL,
  Course,
  COURSE_MODEL,
  CourseStatus,
  Enrollment,
  ENROLLMENT_MODEL,
  User,
  USER_MODEL,
} from '../models';
import { CourseAccessService } from './course-access.service';
import { CourseListQueryDto } from './dto/course-list-query.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

export interface CourseResponse {
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

export interface CourseDetailsResponse extends CourseResponse {
  isOwner: boolean;
  studentsCount: number | null; // только для преподавателя-владельца
}

interface CourseLike {
  _id: unknown;
  title: string;
  description: string;
  status: CourseStatus;
  version: number;
  categoryId: unknown;
  teacherId: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export function courseCacheKey(courseId: string): string {
  return `course:${courseId}`;
}

// Студент может быть зачислен на много курсов, но для списка берем разумный предел
const MAX_STUDENT_COURSES = 1000;

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(COURSE_MODEL) private readonly courses: Model<Course>,
    @InjectModel(CATEGORY_MODEL) private readonly categories: Model<Category>,
    @InjectModel(ENROLLMENT_MODEL) private readonly enrollments: Model<Enrollment>,
    @InjectModel(USER_MODEL) private readonly users: Model<User>,
    @InjectConnection() private readonly connection: Connection,
    private readonly access: CourseAccessService,
    private readonly cache: CacheService,
  ) {}

  // "Мои курсы": преподавателю - свои, студенту - те, куда он зачислен
  async list(query: CourseListQueryDto, user: AuthUser): Promise<Page<CourseResponse>> {
    const filter: FilterQuery<Course> = {};

    if (user.role === 'teacher') {
      filter.teacherId = user.id;
    } else {
      const enrollments = await this.enrollments
        .find({ studentId: user.id, status: 'active' })
        .select('courseId')
        .limit(MAX_STUDENT_COURSES)
        .lean();
      filter._id = { $in: enrollments.map((e) => e.courseId) };
    }

    if (query.status) filter.status = query.status;
    if (query.categoryId) filter.categoryId = query.categoryId;
    const regex = searchRegex(query.search);
    if (regex) filter.title = regex;

    const [items, total] = await Promise.all([
      this.courses.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skipOf(query)).limit(query.limit).lean(),
      this.courses.countDocuments(filter),
    ]);

    return { items: await this.toResponses(items), page: query.page, limit: query.limit, total };
  }

  async create(dto: CreateCourseDto, user: AuthUser): Promise<CourseResponse> {
    return withTransaction(this.connection, async (session) => {
      // Счетчик курсов в категории: параллельное архивирование категории не пройдет
      const category = await this.categories.findOneAndUpdate(
        { _id: dto.categoryId, archived: false },
        { $inc: { coursesCount: 1 } },
        { session, new: true },
      );
      if (!category) {
        const message = 'Категория не найдена или в архиве';
        throw new AppError(400, 'VALIDATION_ERROR', message, { categoryId: message });
      }

      const [course] = await this.courses.create(
        [{ title: dto.title, description: dto.description ?? '', categoryId: category._id, teacherId: user.id }],
        { session },
      );

      return this.toResponse(course.toObject(), category.name, user.displayName);
    });
  }

  // Карточка курса. Общая часть (название, описание, категория, преподаватель) берется из кеша на 60 секунд.
  // Проверка доступа НЕ кешируется: владение сверяется с карточкой, зачисление студента читается из базы
  // на каждом запросе. Число студентов (только владельцу) тоже всегда из базы
  async getOne(courseId: string, user: AuthUser): Promise<{ course: CourseDetailsResponse; cacheHit: boolean }> {
    const { value: card, hit } = await this.cache.getOrLoad(courseCacheKey(courseId), async () => {
      const course = await this.courses.findById(courseId).lean();
      if (!course) throw notFound('Курс не найден');
      const [response] = await this.toResponses([course]);
      return response;
    });

    const isOwner = user.role === 'teacher' && card.teacher.id === user.id;
    const allowed = isOwner || (user.role === 'student' && (await this.access.isEnrolled(courseId, user.id)));
    if (!allowed) {
      throw notFound('Курс не найден');
    }

    const studentsCount = isOwner ? await this.enrollments.countDocuments({ courseId, status: 'active' }) : null;
    return { course: { ...card, isOwner, studentsCount }, cacheHit: hit };
  }

  async update(courseId: string, dto: UpdateCourseDto, user: AuthUser): Promise<CourseResponse> {
    await this.access.getOwnCourse(courseId, user);

    const changes: Partial<Pick<Course, 'title' | 'description'>> = {};
    if (dto.title !== undefined) changes.title = dto.title;
    if (dto.description !== undefined) changes.description = dto.description;
    if (Object.keys(changes).length === 0) {
      throw validationError('Нет изменений для сохранения');
    }

    // Условное обновление по version: устаревшая форма не перезапишет чужие изменения
    const updated = await this.courses
      .findOneAndUpdate(
        { _id: courseId, teacherId: user.id, version: dto.version },
        { $set: changes, $inc: { version: 1 } },
        { new: true, runValidators: true },
      )
      .lean();

    if (!updated) {
      throw conflict('VERSION_CONFLICT', 'Курс уже изменили в другом окне. Обновите данные и повторите');
    }
    // Очистка кеша сразу после успешного изменения: следующее чтение получит актуальные данные
    this.cache.delete(courseCacheKey(courseId));

    const [response] = await this.toResponses([updated]);
    return response;
  }

  private async toResponses(courses: CourseLike[]): Promise<CourseResponse[]> {
    const [categoryNames, teacherNames] = await Promise.all([
      loadNames(this.categories, courses.map((c) => c.categoryId), 'name'),
      loadNames(this.users, courses.map((c) => c.teacherId), 'displayName'),
    ]);
    return courses.map((c) =>
      this.toResponse(c, categoryNames.get(String(c.categoryId)) ?? '', teacherNames.get(String(c.teacherId)) ?? ''),
    );
  }

  private toResponse(c: CourseLike, categoryName: string, teacherName: string): CourseResponse {
    return {
      id: String(c._id),
      title: c.title,
      description: c.description,
      status: c.status,
      version: c.version,
      category: { id: String(c.categoryId), name: categoryName },
      teacher: { id: String(c.teacherId), displayName: teacherName },
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}
