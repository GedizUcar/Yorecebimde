import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service.js';

/**
 * Better-Auth catch-all handler.
 *
 * Faz 2: `@swc-node/register` dev loader artık class-based DI metadata'yı
 * doğru emit ediyor — explicit `@Inject()` gerekli değil.
 */
@ApiExcludeController()
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @All('*')
  async handler(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const init: RequestInit = {
      method: req.method,
      headers: req.headers as Record<string, string>,
    };
    if (!['GET', 'HEAD'].includes(req.method)) {
      init.body = JSON.stringify(req.body ?? {});
    }
    const webReq = new Request(url, init);
    const webRes = await this.authService.auth.handler(webReq);
    reply.status(webRes.status);
    webRes.headers.forEach((v, k) => reply.header(k, v));
    const body = await webRes.text();
    reply.send(body);
  }
}
