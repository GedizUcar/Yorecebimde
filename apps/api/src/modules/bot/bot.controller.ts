import { Body, Controller, Get, Headers as Hdr, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { and, eq, gte, isNull, like, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { auditLogs, users } from '@yorecebimde/db/schema';
import { BotService } from './bot.service.js';
import { AuthService } from '../auth/auth.service.js';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard.js';
import { BusinessRuleError } from '@yorecebimde/shared';

const DEVICE_HEADER = 'x-device-id';

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model', 'function']),
        content: z.string(),
        name: z.string().optional(),
      }),
    )
    .max(50)
    .default([]),
  locale: z.enum(['tr', 'en']).default('tr'),
});
class ChatDto extends createZodDto(chatSchema) {}

const MONTHLY_QUOTA = 1000;

@Controller('bot')
@UseGuards(RateLimitGuard)
export class BotController {
  constructor(
    private readonly bot: BotService,
    private readonly authService: AuthService,
    @Inject(DB_TOKEN) private readonly db: DbToken,
  ) {}

  @Post('chat')
  @RateLimit({ max: 60, windowSeconds: 3600 })
  async chat(
    @Body() body: ChatDto,
    @Req() req: FastifyRequest,
    @Hdr(DEVICE_HEADER) deviceId?: string,
  ) {
    const { userId, userName } = await this.resolveUser(req);

    // Faz 7 — aylık quota (login'li kullanıcılar için audit_logs üzerinden sayım)
    if (userId) {
      const used = await this.monthlyUsageCount(userId);
      if (used >= MONTHLY_QUOTA) {
        throw new BusinessRuleError(
          `Aylık ${MONTHLY_QUOTA} mesaj limitiniz doldu. Sonraki ay tekrar deneyin.`,
        );
      }
    }

    const history = body.history.map((h) =>
      h.name !== undefined
        ? { role: h.role, content: h.content, name: h.name }
        : { role: h.role, content: h.content },
    );
    const result = await this.bot.chat({
      userMessage: body.message,
      history,
      userId,
      deviceId: deviceId ?? null,
      locale: body.locale,
      userName,
    });
    return { data: result };
  }

  /**
   * SSE streaming endpoint. Event tipleri:
   *   `token` — final text chunk (data: { text })
   *   `function` — function call (data: { name, args })
   *   `function_result` — function sonucu (data: { result })
   *   `done` — bitti (data: { history })
   *   `error` — hata (data: { message })
   */
  @Post('chat-stream')
  @RateLimit({ max: 60, windowSeconds: 3600 })
  async chatStream(
    @Body() body: ChatDto,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Hdr(DEVICE_HEADER) deviceId?: string,
  ) {
    const { userId, userName } = await this.resolveUser(req);

    if (userId) {
      const used = await this.monthlyUsageCount(userId);
      if (used >= MONTHLY_QUOTA) {
        return res.code(429).send({
          error: { code: 'QUOTA_EXCEEDED', message: 'Aylık limit doldu' },
        });
      }
    }

    const history = body.history.map((h) =>
      h.name !== undefined
        ? { role: h.role, content: h.content, name: h.name }
        : { role: h.role, content: h.content },
    );

    // SSE headers
    res.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    try {
      for await (const event of this.bot.chatStream({
        userMessage: body.message,
        history,
        userId,
        deviceId: deviceId ?? null,
        locale: body.locale,
        userName,
      })) {
        res.raw.write(`event: ${event.type}\n`);
        res.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      res.raw.write(`event: error\n`);
      res.raw.write(
        `data: ${JSON.stringify({ message: err instanceof Error ? err.message : String(err) })}\n\n`,
      );
    } finally {
      res.raw.end();
    }
    return res;
  }

  @Get('usage')
  async usage(@Req() req: FastifyRequest) {
    const { userId } = await this.resolveUser(req);
    if (!userId) return { data: { used: 0, quota: MONTHLY_QUOTA } };
    const used = await this.monthlyUsageCount(userId);
    return { data: { used, quota: MONTHLY_QUOTA } };
  }

  private async monthlyUsageCount(userId: string): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
    const rows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.actorUserId, userId),
          like(auditLogs.action, 'bot.function.%'),
          gte(auditLogs.createdAt, thirtyDaysAgo),
        ),
      );
    return rows[0]?.count ?? 0;
  }

  private async resolveUser(
    req: FastifyRequest,
  ): Promise<{ userId: string | null; userName: string | null }> {
    try {
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === 'string') headers.set(k, v);
        else if (Array.isArray(v)) headers.set(k, v.join(','));
      }
      const session = await this.authService.auth.api.getSession({ headers });
      if (!session?.user) return { userId: null, userName: null };
      const rows = await this.db
        .select({ id: users.id, firstName: users.firstName })
        .from(users)
        .where(and(eq(users.authUserId, session.user.id), isNull(users.deletedAt)))
        .limit(1);
      const u = rows[0];
      if (!u) return { userId: null, userName: null };
      return { userId: u.id, userName: u.firstName ?? null };
    } catch {
      return { userId: null, userName: null };
    }
  }
}
