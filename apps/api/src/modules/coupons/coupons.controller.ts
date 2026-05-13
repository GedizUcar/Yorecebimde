import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard, type SessionUser } from '../../common/guards/session.guard.js';
import { CouponsService } from './coupons.service.js';

const validateSchema = z.object({
  code: z.string().min(2).max(50),
  cartSubtotalCents: z.number().int().nonnegative(),
  categoryIds: z.array(z.string().uuid()).optional(),
  sellerIds: z.array(z.string().uuid()).optional(),
});
class ValidateDto extends createZodDto(validateSchema) {}

@Controller('coupons')
@UseGuards(SessionGuard)
export class CouponsController {
  constructor(private readonly svc: CouponsService) {}

  @Post('validate')
  async validate(@CurrentUser() user: SessionUser, @Body() body: ValidateDto) {
    const ctx: { categoryIds?: string[]; sellerIds?: string[] } = {};
    if (body.categoryIds?.length) ctx.categoryIds = body.categoryIds;
    if (body.sellerIds?.length) ctx.sellerIds = body.sellerIds;
    return {
      data: await this.svc.validate(body.code, user.id, body.cartSubtotalCents, ctx),
    };
  }

  @Get('my')
  async myCoupons(@CurrentUser() user: SessionUser) {
    return { data: await this.svc.listMyCoupons(user.id) };
  }
}
