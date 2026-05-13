import {
  Body,
  Controller,
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
import { StockService, adjustStockSchema, setStockSchema } from './stock.service.js';

class AdjustStockDto extends createZodDto(adjustStockSchema) {}
class SetStockDto extends createZodDto(setStockSchema) {}

@Controller('seller/products/:productId/stock')
@UseGuards(SellerGuard)
export class StockController {
  constructor(private readonly service: StockService) {}

  @Post('adjust')
  @HttpCode(200)
  async adjust(
    @CurrentUser() user: SessionUser,
    @Param('productId') productId: string,
    @Body() body: AdjustStockDto,
  ) {
    const data = await this.service.adjust(user.sellerId!, productId, user.id, body);
    return { data };
  }

  @Patch()
  async set(
    @CurrentUser() user: SessionUser,
    @Param('productId') productId: string,
    @Body() body: SetStockDto,
  ) {
    const data = await this.service.set(user.sellerId!, productId, user.id, body);
    return { data };
  }

  @Get('history')
  async history(
    @CurrentUser() user: SessionUser,
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.service.history(
      user.sellerId!,
      productId,
      limit ? Number(limit) : 50,
    );
    return { data };
  }
}
