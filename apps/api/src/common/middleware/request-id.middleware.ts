import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: FastifyRequest['raw'] & { requestId?: string }, res: FastifyReply['raw'], next: () => void) {
    const headerId = req.headers['x-request-id'];
    const id = typeof headerId === 'string' && headerId.length > 0 ? headerId : randomUUID();
    req.requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
  }
}
