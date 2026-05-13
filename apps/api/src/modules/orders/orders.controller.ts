import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  SessionGuard,
  SellerGuard,
  type SessionUser,
} from '../../common/guards/session.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { OrdersService, createOrderSchema } from './orders.service.js';

class CreateOrderDto extends createZodDto(createOrderSchema) {}

const shipSchema = z.object({
  trackingNo: z.string().min(3).max(100),
  cargoMode: z
    .enum(['self_managed', 'aras', 'mng', 'yurtici', 'ptt', 'integrated_other'])
    .default('self_managed'),
});
class ShipDto extends createZodDto(shipSchema) {}

const cancelSchema = z.object({ reason: z.string().min(3).max(500) });
class CancelDto extends createZodDto(cancelSchema) {}

@Controller('orders')
@UseGuards(SessionGuard)
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  async list(
    @CurrentUser() user: SessionUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.service.listForUser(
      user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
    return { data };
  }

  @Get(':idOrNo')
  async detail(@CurrentUser() user: SessionUser, @Param('idOrNo') idOrNo: string) {
    const data = await this.service.findForUser(user.id, idOrNo);
    return { data };
  }

  @Post()
  @HttpCode(201)
  async create(@CurrentUser() user: SessionUser, @Body() body: CreateOrderDto) {
    const data = await this.service.createFromCart(user.id, body);
    return { data };
  }

  @Post(':id/confirm-delivery')
  @HttpCode(200)
  async confirmDelivery(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    const data = await this.service.customerConfirmDelivery(user.id, id);
    return { data };
  }
}

@Controller('seller/orders')
@UseGuards(SellerGuard)
export class SellerOrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  async list(
    @CurrentUser() user: SessionUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.service.listForSeller(
      user.sellerId!,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      status,
    );
    return { data };
  }

  @Get(':id')
  async detail(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    const data = await this.service.findForSeller(user.sellerId!, id);
    return { data };
  }

  @Post(':id/confirm')
  @HttpCode(200)
  async confirm(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return { data: await this.service.sellerTransition(user.sellerId!, id, 'confirmed') };
  }

  @Post(':id/start-preparing')
  @HttpCode(200)
  async startPreparing(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return { data: await this.service.sellerTransition(user.sellerId!, id, 'preparing') };
  }

  @Post(':id/ship')
  @HttpCode(200)
  async ship(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: ShipDto,
  ) {
    return {
      data: await this.service.sellerTransition(user.sellerId!, id, 'shipped', {
        trackingNo: body.trackingNo,
        cargoMode: body.cargoMode,
      }),
    };
  }

  @Post(':id/mark-delivered')
  @HttpCode(200)
  async markDelivered(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return { data: await this.service.sellerTransition(user.sellerId!, id, 'delivered') };
  }

  @Post(':id/cancel')
  @HttpCode(200)
  async cancel(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: CancelDto,
  ) {
    return {
      data: await this.service.sellerTransition(user.sellerId!, id, 'cancelled', {
        cancelReason: body.reason,
      }),
    };
  }
}
