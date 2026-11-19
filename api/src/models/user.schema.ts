import { HydratedDocument, Schema } from 'mongoose';
import { LIMITS } from '../common/limits';

export const USER_MODEL = 'User';

export const USER_ROLES = ['teacher', 'student'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  displayName: string;
  email: string; // хранится в нижнем регистре
  passwordHash: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = new Schema<User>(
  {
    displayName: {
      type: String,
      required: [true, 'Укажите имя'],
      trim: true,
      minlength: [LIMITS.displayName.min, `Имя не короче ${LIMITS.displayName.min} символов`],
      maxlength: [LIMITS.displayName.max, `Имя не длиннее ${LIMITS.displayName.max} символов`],
    },
    email: {
      type: String,
      required: [true, 'Укажите email'],
      trim: true,
      lowercase: true,
      maxlength: [LIMITS.email.max, 'Слишком длинный email'],
    },
    // select: false - хеш не попадает в обычные запросы, только при входе
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: { values: [...USER_ROLES], message: 'Неизвестная роль' },
      default: 'student',
      required: true,
    },
    active: { type: Boolean, default: true },
  },
  { collection: 'users', timestamps: true, versionKey: false },
);

// Индекс 1: уникальный email
UserSchema.index({ email: 1 }, { unique: true, name: 'uniq_email' });
