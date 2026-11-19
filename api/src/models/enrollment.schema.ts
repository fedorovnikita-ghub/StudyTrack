import { HydratedDocument, Schema, Types } from 'mongoose';
import { integerValidator } from './common';

export const ENROLLMENT_MODEL = 'Enrollment';

export const ENROLLMENT_STATUSES = ['active', 'removed'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export interface Enrollment {
  courseId: Types.ObjectId;
  studentId: Types.ObjectId;
  status: EnrollmentStatus;
  enrolledBy: Types.ObjectId;
  // Увеличивается в транзакции каждой сдачи: одновременные сдачи одного студента
  // конфликтуют на этом документе, и номер версии не может задвоиться
  guardVersion: number;
  removedAt: Date | null;
  removeReason: string; // причина отчисления, обязательна при отчислении
  createdAt: Date;
  updatedAt: Date;
}

export type EnrollmentDocument = HydratedDocument<Enrollment>;

export const EnrollmentSchema = new Schema<Enrollment>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: { values: [...ENROLLMENT_STATUSES], message: 'Неизвестный статус зачисления' },
      default: 'active',
      required: true,
    },
    enrolledBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    guardVersion: { type: Number, default: 0, min: 0, validate: integerValidator },
    removedAt: { type: Date, default: null },
    removeReason: { type: String, trim: true, default: '', maxlength: [500, 'Причина не длиннее 500 символов'] },
  },
  { collection: 'enrollments', timestamps: true, versionKey: false },
);

// Индекс 2: у студента не больше одного ДЕЙСТВУЮЩЕГО зачисления на курс.
// Записи со статусом removed остаются в истории и в уникальности не участвуют
EnrollmentSchema.index(
  { courseId: 1, studentId: 1 },
  { unique: true, name: 'uniq_active_enrollment', partialFilterExpression: { status: 'active' } },
);
// Список курсов студента
EnrollmentSchema.index({ studentId: 1, status: 1, createdAt: -1 }, { name: 'student_courses_list' });
