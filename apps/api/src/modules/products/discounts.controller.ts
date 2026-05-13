import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { SellerGuard } from '../../common/guards/session.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SessionUser } from '../../common/guards/session.guard.js';
import {
  DiscountsService,
  createDiscountSchema,
  updateDiscountSchema,
  type CreateDiscountInput,
  type UpdateDiscountInput,
} from './discounts.service.js';

@Controller('seller/products/:productId/discounts')
@UseGuards(SellerGuard)
export class DiscountsController {
  constructor(private readonly service: DiscountsService) {}

  @Get()
  async list(@CurrentUser() user: SessionUser, @Param('productId') productId: string) {
    const data = await this.service.list(user.sellerId!, productId);
    return { data };
  }

  @Post()
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(createDiscountSchema))
  async create(
    @CurrentUser() user: SessionUser,
    @Param('productId') productId: string,
    @Body() body: CreateDiscountInput,
  ) {
    const data = await this.service.create(user.sellerId!, productId, body);
    return { data };
  }

  @Patch(':discountId')
  @UsePipes(new ZodValidationPipe(updateDiscountSchema))
  async update(
    @CurrentUser() user: SessionUser,
    @Param('productId') productId: string,
    @Param('discountId') discountId: string,
    @Body() body: UpdateDiscountInput,
  ) {
    const data = await this.service.update(user.sellerId!, productId, discountId, body);
    return { data };
  }

  @Delete(':discountId')
  async remove(
    @CurrentUser() user: SessionUser,
    @Param('productId') productId: string,
    @Param('discountId') discountId: string,
  ) {
    await this.service.remove(user.sellerId!, productId, discountId);
    return { data: { discountId, deleted: true } };
  }
}
