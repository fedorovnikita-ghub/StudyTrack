import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { LIMITS } from '../../common/limits';
import { trimString } from '../../common/validators';

export class RemoveEnrollmentDto {
  @Transform(trimString)
  @IsString({ message: 'Укажите причину' })
  @Length(LIMITS.reason.min, LIMITS.reason.max, {
    message: `Причина от ${LIMITS.reason.min} до ${LIMITS.reason.max} символов`,
  })
  reason: string;
}
