import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { unauthorized } from '../common/app-error';
import { getRequest } from '../common/request-context';
import { UserRole } from '../models';
import { AuthUser } from './auth.types';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

// Маршрут доступен без входа. По умолчанию все маршруты закрыты
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Маршрут доступен только указанным ролям
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// Текущий пользователь из проверенного токена
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const req = getRequest(ctx);
  if (!req.user) {
    throw unauthorized();
  }
  return req.user;
});
