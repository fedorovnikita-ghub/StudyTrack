import { IsString, MaxLength } from 'class-validator';
import { LIMITS } from '../../common/limits';

// Автор, номер версии, время и пометка о просрочке назначаются сервером
export class CreateSubmissionDto {
  @IsString({ message: 'Введите текст работы' })
  @MaxLength(LIMITS.submissionText.max, { message: `Текст не длиннее ${LIMITS.submissionText.max} символов` })
  text: string;
}
