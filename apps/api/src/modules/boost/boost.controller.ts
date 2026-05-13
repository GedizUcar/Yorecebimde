import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { and, eq, isNull } from 'drizzle-orm';
import { users, authUser } from '@yorecebimde/db/schema';
import { SellerGuard } from '../../common/guards/session.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SessionUser } from '../../common/guards/session.guard.js';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import { BoostService, purchaseSchema } from './boost.service.js';

class PurchaseDto extends createZodDto(purchaseSchema) {}

@Controller('boost')
export class BoostController {
  constructor(
    private readonly service: BoostService,
    @Inject(DB_TOKEN) private readonly db: DbToken,
  ) {}

  @Get('packages')
  async listPackages() {
    return { data: await this.service.listPackages() };
  }

  @Get('mine')
  @UseGuards(SellerGuard)
  async mine(@CurrentUser() user: SessionUser) {
    return { data: await this.service.listMyBoosts(user.sellerId!) };
  }

  @Get('reports')
  @UseGuards(SellerGuard)
  async reports(@CurrentUser() user: SessionUser) {
    return { data: await this.service.reportForSeller(user.sellerId!) };
  }

  @Post('purchase')
  @HttpCode(200)
  @UseGuards(SellerGuard)
  async purchase(@CurrentUser() user: SessionUser, @Body() body: PurchaseDto) {
    // Buyer email = seller's user email
    const rows = await this.db
      .select({ email: users.email, authEmail: authUser.email })
      .from(users)
      .leftJoin(authUser, eq(authUser.id, users.authUserId))
      .where(and(eq(users.id, user.id), isNull(users.deletedAt)))
      .limit(1);
    const email = rows[0]?.email ?? rows[0]?.authEmail ?? user.email;
    const data = await this.service.purchase(user.sellerId!, email, body);
    return { data };
  }

  @Delete(':id')
  @UseGuards(SellerGuard)
  async cancel(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    const data = await this.service.cancel(user.sellerId!, id);
    return { data };
  }
}
