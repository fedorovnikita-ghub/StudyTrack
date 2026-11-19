import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthUser } from '../auth/auth.types';
import { notFound } from '../common/app-error';
import { Course, COURSE_MODEL, Enrollment, ENROLLMENT_MODEL } from '../models';

// Единые правила доступа к курсу. Используются в REST, а позже в GraphQL и Socket.
// Чужой курс отвечает 404: не раскрываем даже факт его существования
@Injectable()
export class CourseAccessService {
  constructor(
    @InjectModel(COURSE_MODEL) private readonly courses: Model<Course>,
    @InjectModel(ENROLLMENT_MODEL) private readonly enrollments: Model<Enrollment>,
  ) {}

  // Курс, которым владеет преподаватель
  async getOwnCourse(courseId: string, user: AuthUser) {
    const course = await this.courses.findOne({ _id: courseId, teacherId: user.id }).lean();
    if (!course) {
      throw notFound('Курс не найден');
    }
    return course;
  }

  // Курс, доступный пользователю: владелец-преподаватель или студент с действующим зачислением
  async getAccessibleCourse(courseId: string, user: AuthUser) {
    if (user.role === 'teacher') {
      return this.getOwnCourse(courseId, user);
    }

    const enrolled = await this.isEnrolled(courseId, user.id);
    const course = enrolled ? await this.courses.findById(courseId).lean() : null;
    if (!course) {
      throw notFound('Курс не найден');
    }
    return course;
  }

  async isEnrolled(courseId: string, studentId: string): Promise<boolean> {
    const found = await this.enrollments.exists({ courseId, studentId, status: 'active' });
    return found !== null;
  }
}
