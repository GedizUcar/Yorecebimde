import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { SellerGuard } from '../../common/guards/session.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SessionUser } from '../../common/guards/session.guard.js';
import {
  SellerProductsService,
  createProductSchema,
  updateProductSchema,
} from './seller-products.service.js';

class CreateProductDto extends createZodDto(createProductSchema) {}
class UpdateProductDto extends createZodDto(updateProductSchema) {}

@Controller('seller/products')
@UseGuards(SellerGuard)
export class SellerProductsController {
  constructor(private readonly service: SellerProductsService) {}

  @Get()
  async list(
    @CurrentUser() user: SessionUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? Number(page) : 1;
    const l = limit ? Number(limit) : 20;
    const result = await this.service.list(user.sellerId!, p, l);
    return {
      data: result.items,
      meta: { page: p, limit: l, total: result.total, hasMore: p * l < result.total },
    };
  }

  @Get(':productId')
  async findOne(
    @CurrentUser() user: SessionUser,
    @Param('productId') productId: string,
  ) {
    const product = await this.service.findOneWithRelations(user.sellerId!, productId);
    return { data: product };
  }

  @Post()
  @HttpCode(201)
  async create(@CurrentUser() user: SessionUser, @Body() body: CreateProductDto) {
    const product = await this.service.create(user.sellerId!, body);
    return { data: product };
  }

  @Patch(':productId')
  async update(
    @CurrentUser() user: SessionUser,
    @Param('productId') productId: string,
    @Body() body: UpdateProductDto,
  ) {
    const product = await this.service.update(user.sellerId!, productId, body);
    return { data: product };
  }

  @Post(':productId/publish')
  @HttpCode(200)
  async publish(@CurrentUser() user: SessionUser, @Param('productId') productId: string) {
    await this.service.publish(user.sellerId!, productId);
    return { data: { productId, isActive: true } };
  }

  @Post(':productId/unpublish')
  @HttpCode(200)
  async unpublish(@CurrentUser() user: SessionUser, @Param('productId') productId: string) {
    await this.service.unpublish(user.sellerId!, productId);
    return { data: { productId, isActive: false } };
  }

  @Delete(':productId')
  async remove(@CurrentUser() user: SessionUser, @Param('productId') productId: string) {
    await this.service.softDelete(user.sellerId!, productId);
    return { data: { productId, deleted: true } };
  }
}
