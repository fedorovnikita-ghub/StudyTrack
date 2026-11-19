import { Transform } from 'class-transformer';
import { IsIn, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';
import { LIMITS } from '../../common/limits';
import { PageQueryDto } from '../../common/pagination';
import { trimString } from '../../common/validators';
import { COURSE_STATUSES, CourseStatus } from '../../models';

export class CourseListQueryDto extends PageQueryDto {
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(LIMITS.search.max, { message: `Поиск не длиннее ${LIMITS.search.max} символов` })
  search?: string;

  @IsOptional()
  @IsIn([...COURSE_STATUSES], { message: 'Неизвестный статус курса' })
  status?: CourseStatus;

  @IsOptional()
  @IsMongoId({ message: 'Неверная категория' })
  categoryId?: string;
}
