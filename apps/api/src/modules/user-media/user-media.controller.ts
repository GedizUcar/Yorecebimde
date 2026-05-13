import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard, type SessionUser } from '../../common/guards/session.guard.js';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard.js';
import { BusinessRuleError } from '@yorecebimde/shared';
import { UserMediaService, type UserMediaContext } from './user-media.service.js';

const contextSchema = z.enum(['review', 'question_attachment', 'profile_avatar']);

@Controller('user-media')
@UseGuards(SessionGuard, RateLimitGuard)
export class UserMediaController {
  constructor(private readonly svc: UserMediaService) {}

  /**
   * Direct multipart upload — replaces presigned-URL flow. 20 upload/saat per user.
   */
  @Post('upload')
  @RateLimit({ max: 20, windowSeconds: 3600 })
  async upload(@CurrentUser() user: SessionUser, @Req() req: FastifyRequest) {
    const part = await req.file();
    if (!part) throw new BusinessRuleError('Dosya bulunamadı');

    const ctxField = part.fields['context'];
    const ctxValue = Array.isArray(ctxField) ? ctxField[0] : ctxField;
    const ctxRaw =
      ctxValue && 'value' in ctxValue && typeof ctxValue.value === 'string' ? ctxValue.value : null;
    const parsed = contextSchema.safeParse(ctxRaw);
    if (!parsed.success) {
      throw new BusinessRuleError('Geçersiz context', { received: ctxRaw });
    }

    const result = await this.svc.uploadMedia({
      userId: user.id,
      context: parsed.data satisfies UserMediaContext,
      contentType: part.mimetype,
      fileName: part.filename,
      stream: part.file,
    });

    if (part.file.truncated) {
      throw new BusinessRuleError('Dosya çok büyük (max 5 MB)');
    }

    return { data: result };
  }
}
