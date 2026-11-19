import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { AppError, forbidden, unauthorized } from '../common/app-error';
import { isDuplicateKeyError } from '../common/mongo-errors';
import { config } from '../config';
import { User, USER_MODEL, UserDocument } from '../models';
import { AuthUser, SessionResponse, UserResponse } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { hashPassword, verifyPassword } from './password';

const EXPIRED_MESSAGE = 'Сессия истекла или недействительна. Войдите снова';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(USER_MODEL) private readonly users: Model<User>,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<SessionResponse> {
    const passwordHash = await hashPassword(dto.password);

    try {
      // Роль всегда student: преподаватели создаются только seed или командой user:create
      const user = await this.users.create({
        displayName: dto.displayName,
        email: dto.email,
        passwordHash,
        role: 'student',
      });
      return this.createSession(user);
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        const message = 'Пользователь с таким email уже зарегистрирован';
        throw new AppError(409, 'EMAIL_TAKEN', message, { email: message });
      }
      throw err;
    }
  }

  async login(dto: LoginDto): Promise<SessionResponse> {
    const user = await this.users.findOne({ email: dto.email }).select('+passwordHash');
    const passwordOk = await verifyPassword(dto.password, user?.passwordHash);

    // Одно сообщение и для неизвестного email, и для неверного пароля
    if (!user || !passwordOk) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Неверный email или пароль');
    }
    if (!user.active) {
      throw forbidden('Аккаунт отключен');
    }
    return this.createSession(user);
  }

  // Проверка токена на каждом защищенном запросе. Пользователь читается из базы,
  // поэтому отключенный аккаунт или смена роли действуют сразу, а не через 60 минут
  async verifyToken(token: string): Promise<AuthUser> {
    let payload: { sub?: unknown };
    try {
      payload = await this.jwt.verifyAsync<{ sub?: unknown }>(token, { algorithms: ['HS256'] });
    } catch {
      throw unauthorized(EXPIRED_MESSAGE);
    }

    if (typeof payload.sub !== 'string' || !isValidObjectId(payload.sub)) {
      throw unauthorized(EXPIRED_MESSAGE);
    }

    const user = await this.users.findById(payload.sub).lean();
    if (!user || !user.active) {
      throw unauthorized(EXPIRED_MESSAGE);
    }

    return {
      id: String(user._id),
      role: user.role,
      displayName: user.displayName,
      email: user.email,
    };
  }

  private async createSession(user: UserDocument): Promise<SessionResponse> {
    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    const expiresAt = new Date(Date.now() + config.jwtExpiresInSec * 1000);
    return { token, expiresAt: expiresAt.toISOString(), user: toUserResponse(user) };
  }
}

export function toUserResponse(user: { _id: unknown; displayName: string; email: string; role: User['role'] }): UserResponse {
  return {
    id: String(user._id),
    displayName: user.displayName,
    email: user.email,
    role: user.role,
  };
}
