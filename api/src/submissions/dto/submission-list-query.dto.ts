import { IsIn, IsMongoId, IsOptional } from 'class-validator';
import { PageQueryDto } from '../../common/pagination';
import { SUBMISSION_STATUSES, SubmissionStatus } from '../../models';

// Фильтры доступны преподавателю. Студент всегда видит только свои версии
export class SubmissionListQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn([...SUBMISSION_STATUSES], { message: 'Неизвестный статус работы' })
  status?: SubmissionStatus;

  @IsOptional()
  @IsMongoId({ message: 'Неверный студент' })
  studentId?: string;
}
