import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { unauthorized } from '../common/app-error';
import { getRequest } from '../common/request-context';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './decorators';

// Глобальный guard: каждый маршрут требует вход, если он не помечен @Public()
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = getRequest(context);
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw unauthorized();
    }

    req.user = await this.authService.verifyToken(token);
    return true;
  }
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [type, token] = header.split(' ');
  return type === 'Bearer' && token ? token : null;
}
