import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { LIMITS } from '../../common/limits';
import { MaxUtf8Bytes, normalizeEmail, trimString } from '../../common/validators';

// Роли здесь нет: регистрация всегда создает студента, лишнее поле role вернет 400
export class RegisterDto {
  @Transform(trimString)
  @IsString({ message: 'Укажите имя' })
  @Length(LIMITS.displayName.min, LIMITS.displayName.max, {
    message: `Имя от ${LIMITS.displayName.min} до ${LIMITS.displayName.max} символов`,
  })
  displayName: string;

  @Transform(normalizeEmail)
  @IsString({ message: 'Укажите email' })
  @MaxLength(LIMITS.email.max, { message: 'Слишком длинный email' })
  @IsEmail({}, { message: 'Неверный формат email' })
  email: string;

  @IsString({ message: 'Укажите пароль' })
  @MinLength(LIMITS.password.min, { message: `Пароль не короче ${LIMITS.password.min} символов` })
  @MaxUtf8Bytes(LIMITS.password.maxBytes, { message: 'Пароль слишком длинный' })
  password: string;
}
