import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { LIMITS } from '../../common/limits';
import { trimString } from '../../common/validators';

// Верхняя граница балла зависит от задания и проверяется в сервисе
export class GradeSubmissionDto {
  @IsInt({ message: 'Балл - целое число' })
  @Min(0, { message: 'Балл не может быть отрицательным' })
  score: number;

  @Transform(trimString)
  @IsOptional()
  @IsString({ message: 'Комментарий должен быть текстом' })
  @MaxLength(LIMITS.gradeComment.max, { message: `Комментарий не длиннее ${LIMITS.gradeComment.max} символов` })
  comment?: string;

  // Версия работы, которую видел преподаватель
  @IsInt({ message: 'Не передана версия работы' })
  @Min(1, { message: 'Неверная версия работы' })
  version: number;
}
