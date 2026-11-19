import { ExecutionContext } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { AuthUser } from '../auth/auth.types';

export interface RequestWithUser {
  headers: { authorization?: string };
  user?: AuthUser;
}

// HTTP-запрос и для REST, и для GraphQL: guard-ы и декораторы работают одинаково,
// поэтому GraphQL использует те же проверки входа и ролей, что и REST
export function getRequest(context: ExecutionContext): RequestWithUser {
  if (context.getType<GqlContextType>() === 'graphql') {
    return GqlExecutionContext.create(context).getContext<{ req: RequestWithUser }>().req;
  }
  return context.switchToHttp().getRequest<RequestWithUser>();
}
