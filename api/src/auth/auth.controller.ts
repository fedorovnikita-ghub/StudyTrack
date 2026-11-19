import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthUser } from './auth.types';
import { CurrentUser, Public } from './decorators';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/v1/auth/register - регистрация студента, сразу выдает токен
  @Public()
  @Post('register')
  @HttpCode(201)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // POST /api/v1/auth/login
  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // POST /api/v1/auth/logout - JWT не хранится на сервере, поэтому выход - это очистка
  // токена и закрытие Socket на клиенте. Серверного отзыва выданных токенов нет
  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(): void {}

  // GET /api/v1/auth/me - текущий пользователь
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return { user: { id: user.id, displayName: user.displayName, email: user.email, role: user.role } };
  }
}
