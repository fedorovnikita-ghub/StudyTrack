import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { LIMITS } from '../../common/limits';
import { PageQueryDto } from '../../common/pagination';
import { trimString } from '../../common/validators';
import { ENROLLMENT_STATUSES, EnrollmentStatus } from '../../models';

export class EnrollmentListQueryDto extends PageQueryDto {
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(LIMITS.search.max, { message: `Поиск не длиннее ${LIMITS.search.max} символов` })
  search?: string;

  @IsOptional()
  @IsIn([...ENROLLMENT_STATUSES], { message: 'Неизвестный статус зачисления' })
  status?: EnrollmentStatus;
}
