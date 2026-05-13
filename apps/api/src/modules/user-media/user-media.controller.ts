import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard, type SessionUser } from '../../common/guards/session.guard.js';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard.js';
import { UserMediaService } from './user-media.service.js';

const presignSchema = z.object({
  context: z.enum(['review', 'question_attachment', 'profile_avatar']),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  fileName: z.string().min(1).max(255),
});
class PresignDto extends createZodDto(presignSchema) {}

@Controller('user-media')
@UseGuards(SessionGuard, RateLimitGuard)
export class UserMediaController {
  constructor(private readonly svc: UserMediaService) {}

  /**
   * Müşteri review/Q&A için fotoğraf upload presigned URL.
   * 20 upload/saat — spam/storage abuse koruması.
   */
  @Post('presign')
  @RateLimit({ max: 20, windowSeconds: 3600 })
  async presign(@CurrentUser() user: SessionUser, @Body() body: PresignDto) {
    return {
      data: await this.svc.presignUpload({
        userId: user.id,
        context: body.context,
        contentType: body.contentType,
        fileName: body.fileName,
      }),
    };
  }
}
