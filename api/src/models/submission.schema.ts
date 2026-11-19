import { HydratedDocument, Schema, Types } from 'mongoose';
import { LIMITS } from '../common/limits';
import { integerValidator } from './common';

export const SUBMISSION_MODEL = 'Submission';

export const SUBMISSION_STATUSES = ['submitted', 'graded'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

// Копия действующей оценки внутри версии - чтобы список работ не требовал отдельного запроса.
// Полная история оценок хранится в коллекции grades
export interface CurrentGrade {
  gradeId: Types.ObjectId;
  score: number;
  gradedBy: Types.ObjectId;
  gradedAt: Date;
}

export interface Submission {
  assignmentId: Types.ObjectId;
  courseId: Types.ObjectId; // дублируется из задания для проверки доступа и отчетов
  studentId: Types.ObjectId; // автор работы
  number: number; // номер версии внутри пары студент-задание: 1, 2, 3...
  text: string;
  submittedAt: Date;
  isLate: boolean; // сдана позже срока задания
  status: SubmissionStatus;
  currentGrade: CurrentGrade | null;
  version: number; // для защиты от одновременного оценивания
  createdAt: Date;
  updatedAt: Date;
}

export type SubmissionDocument = HydratedDocument<Submission>;

const CurrentGradeSchema = new Schema<CurrentGrade>(
  {
    gradeId: { type: Schema.Types.ObjectId, ref: 'Grade', required: true },
    score: { type: Number, required: true, min: 0, validate: integerValidator },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gradedAt: { type: Date, required: true },
  },
  { _id: false },
);

export const SubmissionSchema = new Schema<Submission>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    number: { type: Number, required: true, min: 1, validate: integerValidator },
    text: {
      type: String,
      required: [true, 'Введите текст работы'],
      maxlength: [LIMITS.submissionText.max, `Текст не длиннее ${LIMITS.submissionText.max} символов`],
    },
    submittedAt: { type: Date, required: true },
    isLate: { type: Boolean, required: true, default: false },
    status: {
      type: String,
      enum: { values: [...SUBMISSION_STATUSES], message: 'Неизвестный статус работы' },
      default: 'submitted',
      required: true,
    },
    currentGrade: { type: CurrentGradeSchema, default: null },
    version: { type: Number, default: 1, min: 1, validate: integerValidator },
  },
  { collection: 'submissions', timestamps: true, versionKey: false },
);

// Индекс 3: номер версии уникален внутри пары студент-задание.
// Он же обслуживает историю версий студента (сортировка по number в любую сторону)
SubmissionSchema.index(
  { assignmentId: 1, studentId: 1, number: 1 },
  { unique: true, name: 'uniq_submission_number' },
);
// Кабинет оценивания: все работы задания, новые сверху
SubmissionSchema.index({ assignmentId: 1, submittedAt: -1 }, { name: 'assignment_submissions_list' });
// Отчеты курса за период
SubmissionSchema.index({ courseId: 1, submittedAt: -1 }, { name: 'course_submissions_by_time' });
