import { HydratedDocument, Schema, Types } from 'mongoose';
import { LIMITS } from '../common/limits';

export const CATEGORY_MODEL = 'Category';

export interface Category {
  name: string;
  parentId: Types.ObjectId | null; // null - категория верхнего уровня
  archived: boolean; // вместо удаления: курсы со ссылкой на категорию остаются целыми
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryDocument = HydratedDocument<Category>;

export const CategorySchema = new Schema<Category>(
  {
    name: {
      type: String,
      required: [true, 'Укажите название категории'],
      trim: true,
      minlength: [LIMITS.categoryName.min, `Название не короче ${LIMITS.categoryName.min} символов`],
      maxlength: [LIMITS.categoryName.max, `Название не длиннее ${LIMITS.categoryName.max} символов`],
    },
    parentId: { type: Schema.Types.ObjectId, ref: CATEGORY_MODEL, default: null },
    archived: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { collection: 'categories', timestamps: true, versionKey: false },
);

// Внутри одного родителя не может быть двух действующих категорий с одинаковым именем (без учета регистра)
CategorySchema.index(
  { parentId: 1, name: 1 },
  {
    unique: true,
    name: 'uniq_active_category_name',
    partialFilterExpression: { archived: false },
    collation: { locale: 'ru', strength: 2 },
  },
);
