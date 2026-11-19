import { HydratedDocument, Schema, Types } from 'mongoose';
import { LIMITS } from '../common/limits';
import { integerValidator } from './common';

export const GRADE_MODEL = 'Grade';

// Каждая выставленная оценка - отдельный документ. Повторное оценивание
// добавляет новую запись, старые остаются историей
export interface Grade {
  submissionId: Types.ObjectId;
  assignmentId: Types.ObjectId;
  courseId: Types.ObjectId;
  studentId: Types.ObjectId;
  score: number; // от 0 до maxScore задания, проверяется в сервисе
  comment: string;
  gradedBy: Types.ObjectId;
  gradedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type GradeDocument = HydratedDocument<Grade>;

export const GradeSchema = new Schema<Grade>(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    score: {
      type: Number,
      required: [true, 'Укажите балл'],
      min: [0, 'Балл не может быть отрицательным'],
      validate: integerValidator,
    },
    comment: {
      type: String,
      trim: true,
      default: '',
      maxlength: [LIMITS.gradeComment.max, `Комментарий не длиннее ${LIMITS.gradeComment.max} символов`],
    },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gradedAt: { type: Date, required: true },
  },
  { collection: 'grades', timestamps: true, versionKey: false },
);

// История оценок конкретной версии
GradeSchema.index({ submissionId: 1, gradedAt: -1 }, { name: 'submission_grade_history' });
// Оценки студента в курсе (личные результаты)
GradeSchema.index({ courseId: 1, studentId: 1 }, { name: 'course_student_grades' });
