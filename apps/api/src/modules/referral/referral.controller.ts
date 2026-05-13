import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard, type SessionUser } from '../../common/guards/session.guard.js';
import { ReferralService } from './referral.service.js';

const redeemSchema = z.object({ code: z.string().min(4).max(16) });
class RedeemDto extends createZodDto(redeemSchema) {}

@Controller('referrals')
@UseGuards(SessionGuard)
export class ReferralController {
  constructor(private readonly svc: ReferralService) {}

  @Get('my-code')
  async myCode(@CurrentUser() user: SessionUser) {
    return { data: await this.svc.getOrCreateCode(user.id) };
  }

  @Get('my-referrals')
  async myReferrals(@CurrentUser() user: SessionUser) {
    return { data: await this.svc.listMyReferrals(user.id) };
  }

  /** Yeni kayıt sonrası kod redeem (signup form'undan). */
  @Post('redeem')
  async redeem(
    @CurrentUser() user: SessionUser,
    @Body() body: RedeemDto,
    @Req() req: FastifyRequest,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.ip
      || undefined;
    return { data: await this.svc.redeemCode(body.code, user.id, ip) };
  }
}
