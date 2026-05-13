import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { SellerGuard } from '../../common/guards/session.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SessionUser } from '../../common/guards/session.guard.js';
import { SellerStoreService, updateStoreSchema } from './seller-store.service.js';

class UpdateStoreDto extends createZodDto(updateStoreSchema) {}

@Controller('seller/store')
@UseGuards(SellerGuard)
export class SellerStoreController {
  constructor(private readonly service: SellerStoreService) {}

  @Get()
  async getMine(@CurrentUser() user: SessionUser) {
    const data = await this.service.getMine(user.sellerId!);
    return { data };
  }

  @Patch()
  async update(@CurrentUser() user: SessionUser, @Body() body: UpdateStoreDto) {
    const data = await this.service.updateMine(user.sellerId!, body);
    return { data };
  }
}
