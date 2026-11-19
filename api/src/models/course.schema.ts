import { HydratedDocument, Schema, Types } from 'mongoose';
import { LIMITS } from '../common/limits';
import { integerValidator } from './common';

export const COURSE_MODEL = 'Course';

export const COURSE_STATUSES = ['active', 'archived'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export interface Course {
  title: string;
  description: string;
  categoryId: Types.ObjectId;
  teacherId: Types.ObjectId; // владелец курса, назначается сервером
  status: CourseStatus;
  version: number; // для защиты от одновременного редактирования
  createdAt: Date;
  updatedAt: Date;
}

export type CourseDocument = HydratedDocument<Course>;

export const CourseSchema = new Schema<Course>(
  {
    title: {
      type: String,
      required: [true, 'Укажите название курса'],
      trim: true,
      minlength: [LIMITS.title.min, `Название не короче ${LIMITS.title.min} символов`],
      maxlength: [LIMITS.title.max, `Название не длиннее ${LIMITS.title.max} символов`],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [LIMITS.description.max, `Описание не длиннее ${LIMITS.description.max} символов`],
    },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: [true, 'Выберите категорию'] },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: { values: [...COURSE_STATUSES], message: 'Неизвестный статус курса' },
      default: 'active',
      required: true,
    },
    version: { type: Number, default: 1, min: 1, validate: integerValidator },
  },
  { collection: 'courses', timestamps: true, versionKey: false },
);

// Список "Мои курсы" преподавателя: фильтр по владельцу и статусу, сортировка по дате
CourseSchema.index({ teacherId: 1, status: 1, createdAt: -1 }, { name: 'teacher_courses_list' });
// Проверка перед архивированием категории: есть ли в ней курсы
CourseSchema.index({ categoryId: 1 }, { name: 'courses_by_category' });
