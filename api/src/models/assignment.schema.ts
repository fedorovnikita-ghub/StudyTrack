import { HydratedDocument, Schema, Types } from 'mongoose';
import { LIMITS } from '../common/limits';
import { integerValidator } from './common';

export const ASSIGNMENT_MODEL = 'Assignment';

export const ASSIGNMENT_STATUSES = ['published', 'archived'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

// Дополнительные параметры задания - вложенный объект
export interface AssignmentSettings {
  maxVersions: number; // сколько версий работы может отправить один студент
  minTextLength: number; // минимальная длина текста работы
}

export interface Assignment {
  courseId: Types.ObjectId;
  title: string;
  text: string;
  dueAt: Date; // срок сдачи, хранится в UTC
  maxScore: number;
  settings: AssignmentSettings;
  status: AssignmentStatus;
  createdBy: Types.ObjectId;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export type AssignmentDocument = HydratedDocument<Assignment>;

const AssignmentSettingsSchema = new Schema<AssignmentSettings>(
  {
    maxVersions: {
      type: Number,
      default: LIMITS.maxVersions.default,
      min: [LIMITS.maxVersions.min, `Не меньше ${LIMITS.maxVersions.min}`],
      max: [LIMITS.maxVersions.max, `Не больше ${LIMITS.maxVersions.max}`],
      validate: integerValidator,
    },
    minTextLength: {
      type: Number,
      default: LIMITS.minTextLength.default,
      min: [LIMITS.minTextLength.min, `Не меньше ${LIMITS.minTextLength.min}`],
      max: [LIMITS.minTextLength.max, `Не больше ${LIMITS.minTextLength.max}`],
      validate: integerValidator,
    },
  },
  { _id: false },
);

export const AssignmentSchema = new Schema<Assignment>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: {
      type: String,
      required: [true, 'Укажите название задания'],
      trim: true,
      minlength: [LIMITS.title.min, `Название не короче ${LIMITS.title.min} символов`],
      maxlength: [LIMITS.title.max, `Название не длиннее ${LIMITS.title.max} символов`],
    },
    text: {
      type: String,
      required: [true, 'Укажите текст задания'],
      trim: true,
      maxlength: [LIMITS.assignmentText.max, `Текст не длиннее ${LIMITS.assignmentText.max} символов`],
    },
    dueAt: { type: Date, required: [true, 'Укажите срок сдачи'] },
    maxScore: {
      type: Number,
      required: [true, 'Укажите максимальный балл'],
      min: [LIMITS.maxScore.min, `Не меньше ${LIMITS.maxScore.min}`],
      max: [LIMITS.maxScore.max, `Не больше ${LIMITS.maxScore.max}`],
      validate: integerValidator,
    },
    settings: { type: AssignmentSettingsSchema, default: () => ({}) },
    status: {
      type: String,
      enum: { values: [...ASSIGNMENT_STATUSES], message: 'Неизвестный статус задания' },
      default: 'published',
      required: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    version: { type: Number, default: 1, min: 1, validate: integerValidator },
  },
  { collection: 'assignments', timestamps: true, versionKey: false },
);

// Задания курса по сроку сдачи
AssignmentSchema.index({ courseId: 1, status: 1, dueAt: 1 }, { name: 'course_assignments_list' });
