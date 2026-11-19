import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { LIMITS } from '../../common/limits';
import { trimString } from '../../common/validators';

// Дата обязательно с часовым поясом: "Z" или "+05:00"
const ISO_WITH_TIMEZONE = /(Z|[+-]\d{2}:\d{2})$/;

export class AssignmentSettingsDto {
  @IsOptional()
  @IsInt({ message: 'Число версий должно быть целым' })
  @Min(LIMITS.maxVersions.min, { message: `Не меньше ${LIMITS.maxVersions.min}` })
  @Max(LIMITS.maxVersions.max, { message: `Не больше ${LIMITS.maxVersions.max}` })
  maxVersions?: number;

  @IsOptional()
  @IsInt({ message: 'Минимальная длина должна быть целым числом' })
  @Min(LIMITS.minTextLength.min, { message: `Не меньше ${LIMITS.minTextLength.min}` })
  @Max(LIMITS.minTextLength.max, { message: `Не больше ${LIMITS.minTextLength.max}` })
  minTextLength?: number;
}

export class CreateAssignmentDto {
  @Transform(trimString)
  @IsString({ message: 'Укажите название задания' })
  @Length(LIMITS.title.min, LIMITS.title.max, {
    message: `Название от ${LIMITS.title.min} до ${LIMITS.title.max} символов`,
  })
  title: string;

  @Transform(trimString)
  @IsString({ message: 'Укажите текст задания' })
  @Length(LIMITS.assignmentText.min, LIMITS.assignmentText.max, {
    message: `Текст задания от ${LIMITS.assignmentText.min} до ${LIMITS.assignmentText.max} символов`,
  })
  text: string;

  @IsString({ message: 'Укажите срок сдачи' })
  @IsISO8601({ strict: true }, { message: 'Срок в формате ISO 8601' })
  @Matches(ISO_WITH_TIMEZONE, { message: 'Срок должен содержать часовой пояс' })
  dueAt: string;

  @IsInt({ message: 'Максимальный балл - целое число' })
  @Min(LIMITS.maxScore.min, { message: `Максимальный балл не меньше ${LIMITS.maxScore.min}` })
  @Max(LIMITS.maxScore.max, { message: `Максимальный балл не больше ${LIMITS.maxScore.max}` })
  maxScore: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => AssignmentSettingsDto)
  settings?: AssignmentSettingsDto;
}
