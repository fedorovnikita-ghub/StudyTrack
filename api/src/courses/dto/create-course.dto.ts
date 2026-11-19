import { Transform } from 'class-transformer';
import { IsMongoId, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { LIMITS } from '../../common/limits';
import { trimString } from '../../common/validators';

// Владелец, статус и version назначает сервер, их в DTO нет
export class CreateCourseDto {
  @Transform(trimString)
  @IsString({ message: 'Укажите название курса' })
  @Length(LIMITS.title.min, LIMITS.title.max, {
    message: `Название от ${LIMITS.title.min} до ${LIMITS.title.max} символов`,
  })
  title: string;

  @Transform(trimString)
  @IsOptional()
  @IsString({ message: 'Описание должно быть текстом' })
  @MaxLength(LIMITS.description.max, { message: `Описание не длиннее ${LIMITS.description.max} символов` })
  description?: string;

  @IsMongoId({ message: 'Выберите категорию' })
  categoryId: string;
}
