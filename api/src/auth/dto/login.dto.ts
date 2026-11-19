import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { LIMITS } from '../../common/limits';
import { normalizeEmail } from '../../common/validators';

// При входе формат проверяем мягко: неверная пара email/пароль дает одно общее сообщение
export class LoginDto {
  @Transform(normalizeEmail)
  @IsString({ message: 'Укажите email' })
  @MinLength(1, { message: 'Укажите email' })
  @MaxLength(LIMITS.email.max, { message: 'Слишком длинный email' })
  email: string;

  @IsString({ message: 'Укажите пароль' })
  @MinLength(1, { message: 'Укажите пароль' })
  @MaxLength(200, { message: 'Слишком длинный пароль' })
  password: string;
}
