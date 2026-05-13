import { Body, Controller, Delete, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard, type SessionUser } from '../../common/guards/session.guard.js';
import { PushService } from './push.service.js';

const registerSchema = z.object({
  token: z.string().min(8).max(500),
  platform: z.enum(['ios', 'android', 'web']),
  deviceLabel: z.string().max(100).optional(),
});
class RegisterDto extends createZodDto(registerSchema) {}

const deleteSchema = z.object({ token: z.string().min(8).max(500) });
class DeleteTokenDto extends createZodDto(deleteSchema) {}

@Controller('push-tokens')
@UseGuards(SessionGuard)
export class PushController {
  constructor(private readonly svc: PushService) {}

  /** Mobil veya web client cihazı kayıt eder. Idempotent. */
  @Post()
  @HttpCode(201)
  async register(@CurrentUser() user: SessionUser, @Body() body: RegisterDto) {
    return {
      data: await this.svc.registerToken(
        user.id,
        body.token,
        body.platform,
        body.deviceLabel,
      ),
    };
  }

  @Get()
  async list(@CurrentUser() user: SessionUser) {
    return { data: await this.svc.listUserTokens(user.id) };
  }

  @Delete()
  async remove(@CurrentUser() user: SessionUser, @Body() body: DeleteTokenDto) {
    await this.svc.deleteToken(user.id, body.token);
    return { data: { ok: true } };
  }
}
