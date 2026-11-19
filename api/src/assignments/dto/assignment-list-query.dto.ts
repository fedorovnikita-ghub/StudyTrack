import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { LIMITS } from '../../common/limits';
import { PageQueryDto } from '../../common/pagination';
import { trimString } from '../../common/validators';

export class AssignmentListQueryDto extends PageQueryDto {
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(LIMITS.search.max, { message: `Поиск не длиннее ${LIMITS.search.max} символов` })
  search?: string;
}
