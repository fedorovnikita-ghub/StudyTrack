import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';
import { LIMITS } from '../../common/limits';
import { trimString } from '../../common/validators';

export class UpdateCourseDto {
  @Transform(trimString)
  @IsOptional()
  @IsString({ message: 'Название должно быть текстом' })
  @Length(LIMITS.title.min, LIMITS.title.max, {
    message: `Название от ${LIMITS.title.min} до ${LIMITS.title.max} символов`,
  })
  title?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString({ message: 'Описание должно быть текстом' })
  @MaxLength(LIMITS.description.max, { message: `Описание не длиннее ${LIMITS.description.max} символов` })
  description?: string;

  // Версия, которую видел пользователь при открытии формы
  @IsInt({ message: 'Не передана версия курса' })
  @Min(1, { message: 'Неверная версия курса' })
  version: number;
}
