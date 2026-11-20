import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorExample, ApiErrors, ApiSuccess, EXAMPLES } from '../common/swagger';
import { AuthService } from './auth.service';
import { AuthUser } from './auth.types';
import { CurrentUser, Public } from './decorators';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Вход')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/v1/auth/register - регистрация студента, сразу выдает токен
  @Public()
  @ApiOperation({ summary: 'Регистрация (всегда роль student)', description: 'Поле role не принимается: лишнее поле дает 400.' })
  @ApiSuccess(201, 'Аккаунт создан, выдан токен на 60 минут', EXAMPLES.session)
  @ApiErrors(400)
  @ApiErrorExample(409, 'Email уже занят', { code: 'EMAIL_TAKEN', message: 'Пользователь с таким email уже зарегистрирован', fields: { email: 'Пользователь с таким email уже зарегистрирован' } })
  @Post('register')
  @HttpCode(201)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // POST /api/v1/auth/login
  @Public()
  @ApiOperation({ summary: 'Вход' })
  @ApiSuccess(200, 'Токен на 60 минут и пользователь', EXAMPLES.session)
  @ApiErrors(400)
  @ApiErrorExample(401, 'Неверный email или пароль (одно сообщение для обоих случаев)', { code: 'INVALID_CREDENTIALS', message: 'Неверный email или пароль' })
  @ApiErrorExample(403, 'Аккаунт отключен', { code: 'FORBIDDEN', message: 'Аккаунт отключен' })
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // POST /api/v1/auth/logout - JWT не хранится на сервере, поэтому выход - это очистка
  // токена и закрытие Socket на клиенте. Серверного отзыва выданных токенов нет
  @Public()
  @ApiOperation({ summary: 'Выход', description: 'JWT не хранится на сервере: клиент удаляет токен и закрывает Socket. Выданные копии токена не отзываются, а истекают.' })
  @ApiSuccess(204, 'Готово, без тела')
  @Post('logout')
  @HttpCode(204)
  logout(): void {}

  // GET /api/v1/auth/me - текущий пользователь
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Текущий пользователь' })
  @ApiSuccess(200, 'Пользователь', { user: EXAMPLES.user })
  @ApiErrors(401)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return { user: { id: user.id, displayName: user.displayName, email: user.email, role: user.role } };
  }
}
