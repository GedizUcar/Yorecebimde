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
} from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { SellerGuard } from '../../common/guards/session.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SessionUser } from '../../common/guards/session.guard.js';
import {
  VariationsService,
  createVariationSchema,
  updateVariationSchema,
} from './variations.service.js';

class CreateVariationDto extends createZodDto(createVariationSchema) {}
class UpdateVariationDto extends createZodDto(updateVariationSchema) {}

@Controller('seller/products/:productId/variations')
@UseGuards(SellerGuard)
export class VariationsController {
  constructor(private readonly service: VariationsService) {}

  @Get()
  async list(@CurrentUser() user: SessionUser, @Param('productId') productId: string) {
    const data = await this.service.list(user.sellerId!, productId);
    return { data };
  }

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: SessionUser,
    @Param('productId') productId: string,
    @Body() body: CreateVariationDto,
  ) {
    const data = await this.service.create(user.sellerId!, productId, body);
    return { data };
  }

  @Patch(':variationId')
  async update(
    @CurrentUser() user: SessionUser,
    @Param('productId') productId: string,
    @Param('variationId') variationId: string,
    @Body() body: UpdateVariationDto,
  ) {
    const data = await this.service.update(user.sellerId!, productId, variationId, body);
    return { data };
  }

  @Delete(':variationId')
  async remove(
    @CurrentUser() user: SessionUser,
    @Param('productId') productId: string,
    @Param('variationId') variationId: string,
  ) {
    await this.service.remove(user.sellerId!, productId, variationId);
    return { data: { variationId, deleted: true } };
  }
}
