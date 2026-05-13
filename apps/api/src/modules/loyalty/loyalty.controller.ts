import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard, type SessionUser } from '../../common/guards/session.guard.js';
import { LoyaltyService } from './loyalty.service.js';

const redeemSchema = z.object({ points: z.number().int().positive() });
class RedeemDto extends createZodDto(redeemSchema) {}

@Controller('loyalty')
@UseGuards(SessionGuard)
export class LoyaltyController {
  constructor(private readonly svc: LoyaltyService) {}

  @Get('balance')
  async balance(@CurrentUser() user: SessionUser) {
    return { data: await this.svc.getBalance(user.id) };
  }

  @Get('transactions')
  async transactions(@CurrentUser() user: SessionUser) {
    return { data: await this.svc.listTransactions(user.id) };
  }

  /** Checkout sırasında çağrılır — sepete `loyaltyDiscountCents` olarak yansır. */
  @Post('redeem')
  async redeem(@CurrentUser() user: SessionUser, @Body() body: RedeemDto) {
    return { data: await this.svc.redeem(user.id, body.points) };
  }
}
