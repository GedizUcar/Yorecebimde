import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard, type SessionUser } from '../../common/guards/session.guard.js';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard.js';
import { KvkkUserService } from './kvkk-user.service.js';

const deleteSchema = z.object({
  confirm: z.literal(true),
});
class DeleteDto extends createZodDto(deleteSchema) {}

@Controller('kvkk-me')
@UseGuards(SessionGuard, RateLimitGuard)
export class KvkkUserController {
  constructor(private readonly svc: KvkkUserService) {}

  /** Right to access (KVKK madde 11/d). 5 export/saat. */
  @Get('export')
  @RateLimit({ max: 5, windowSeconds: 3600 })
  async exportMyData(@CurrentUser() user: SessionUser) {
    return { data: await this.svc.exportData(user.id) };
  }

  /** Right to erasure (KVKK madde 11/e). 3 deneme/gün. */
  @Post('delete-account')
  @RateLimit({ max: 3, windowSeconds: 86400 })
  async deleteAccount(@CurrentUser() user: SessionUser, @Body() _body: DeleteDto) {
    return { data: await this.svc.deleteAccount(user.id) };
  }
}
