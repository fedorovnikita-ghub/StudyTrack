import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength } from 'class-validator';
import { LIMITS } from '../../common/limits';
import { normalizeEmail } from '../../common/validators';

export class EnrollStudentDto {
  @Transform(normalizeEmail)
  @IsString({ message: 'Укажите email студента' })
  @MaxLength(LIMITS.email.max, { message: 'Слишком длинный email' })
  @IsEmail({}, { message: 'Неверный формат email' })
  email: string;
}
