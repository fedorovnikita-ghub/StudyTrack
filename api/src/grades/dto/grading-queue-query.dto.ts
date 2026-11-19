import { IsIn, IsMongoId, IsOptional } from 'class-validator';
import { PageQueryDto } from '../../common/pagination';
import { SUBMISSION_STATUSES, SubmissionStatus } from '../../models';

export class GradingQueueQueryDto extends PageQueryDto {
  @IsOptional()
  @IsMongoId({ message: 'Неверный курс' })
  courseId?: string;

  // По умолчанию - работы, ожидающие оценки
  @IsOptional()
  @IsIn([...SUBMISSION_STATUSES], { message: 'Неизвестный статус работы' })
  status?: SubmissionStatus;
}
