import { Transform } from 'class-transformer';
import { IsMongoId, IsOptional, IsString, Length } from 'class-validator';
import { LIMITS } from '../../common/limits';
import { trimString } from '../../common/validators';

export class CreateCategoryDto {
  @Transform(trimString)
  @IsString({ message: 'Укажите название категории' })
  @Length(LIMITS.categoryName.min, LIMITS.categoryName.max, {
    message: `Название от ${LIMITS.categoryName.min} до ${LIMITS.categoryName.max} символов`,
  })
  name: string;

  // Пустое значение - категория верхнего уровня
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @IsMongoId({ message: 'Неверная родительская категория' })
  parentId?: string | null;
}
