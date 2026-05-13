import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthRequiredError } from '@yorecebimde/shared';
import type { SessionUser } from '../guards/session.guard.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser => {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    if (!req.user) throw new AuthRequiredError();
    return req.user;
  },
);
