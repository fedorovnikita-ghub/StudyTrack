import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { AppError, conflict, forbidden, notFound } from '../common/app-error';
import { isDuplicateKeyError } from '../common/mongo-errors';
import { Page, skipOf } from '../common/pagination';
import { withTransaction } from '../database/transaction';
import { AuthUser } from '../auth/auth.types';
import { Category, CATEGORY_MODEL } from '../models';
import { CategoryListQueryDto } from './dto/category-list-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

export interface CategoryResponse {
  id: string;
  name: string;
  parentId: string | null;
  archived: boolean;
  coursesCount: number;
  childrenCount: number;
  createdBy: string;
}

// Принимает и lean-объект, и результат toObject(): id приводятся к строкам
interface CategoryLike {
  _id: unknown;
  name: string;
  parentId?: unknown;
  archived: boolean;
  coursesCount: number;
  childrenCount: number;
  createdBy: unknown;
}

function toCategoryResponse(c: CategoryLike): CategoryResponse {
  return {
    id: String(c._id),
    name: c.name,
    parentId: c.parentId ? String(c.parentId) : null,
    archived: c.archived,
    coursesCount: c.coursesCount,
    childrenCount: c.childrenCount,
    createdBy: String(c.createdBy),
  };
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(CATEGORY_MODEL) private readonly categories: Model<Category>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async list(query: CategoryListQueryDto): Promise<Page<CategoryResponse>> {
    const filter = query.includeArchived ? {} : { archived: false };
    const [items, total] = await Promise.all([
      this.categories
        .find(filter)
        .collation({ locale: 'ru' })
        .sort({ name: 1, _id: 1 })
        .skip(skipOf(query))
        .limit(query.limit)
        .lean(),
      this.categories.countDocuments(filter),
    ]);
    return { items: items.map(toCategoryResponse), page: query.page, limit: query.limit, total };
  }

  async create(dto: CreateCategoryDto, user: AuthUser): Promise<CategoryResponse> {
    try {
      return await withTransaction(this.connection, async (session) => {
        if (dto.parentId) {
          // Родитель должен быть действующим. Счетчик детей не даст его заархивировать параллельно
          const parent = await this.categories.findOneAndUpdate(
            { _id: dto.parentId, archived: false },
            { $inc: { childrenCount: 1 } },
            { session, new: true },
          );
          if (!parent) {
            const message = 'Родительская категория не найдена или в архиве';
            throw new AppError(400, 'VALIDATION_ERROR', message, { parentId: message });
          }
        }

        const [created] = await this.categories.create(
          [{ name: dto.name, parentId: dto.parentId ?? null, createdBy: user.id }],
          { session },
        );
        return toCategoryResponse(created.toObject());
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        const message = 'Категория с таким названием уже есть в этом разделе';
        throw new AppError(409, 'CATEGORY_EXISTS', message, { name: message });
      }
      throw err;
    }
  }

  // Удаления нет: категорию можно только отправить в архив, и только пустую
  async archive(id: string, user: AuthUser): Promise<CategoryResponse> {
    const category = await this.categories.findById(id).lean();
    if (!category) {
      throw notFound('Категория не найдена');
    }
    if (String(category.createdBy) !== user.id) {
      throw forbidden('Архивировать категорию может только ее автор');
    }

    return withTransaction(this.connection, async (session) => {
      // Условие и изменение в одном документе: параллельно созданный курс увеличит
      // coursesCount, и это обновление уже не пройдет
      const archived = await this.categories.findOneAndUpdate(
        { _id: id, archived: false, coursesCount: 0, childrenCount: 0 },
        { $set: { archived: true } },
        { session, new: true },
      );

      if (!archived) {
        const current = await this.categories.findById(id).session(session).lean();
        if (!current) throw notFound('Категория не найдена');
        if (current.archived) throw conflict('ALREADY_ARCHIVED', 'Категория уже в архиве');
        if (current.coursesCount > 0) {
          throw conflict('CATEGORY_IN_USE', 'В категории есть курсы, поэтому ее нельзя архивировать');
        }
        throw conflict('CATEGORY_HAS_CHILDREN', 'Сначала архивируйте вложенные категории');
      }

      if (archived.parentId) {
        // Архивная подкатегория больше не мешает архивировать родителя
        await this.categories.updateOne(
          { _id: archived.parentId, childrenCount: { $gt: 0 } },
          { $inc: { childrenCount: -1 } },
          { session },
        );
      }
      return toCategoryResponse(archived.toObject());
    });
  }
}
