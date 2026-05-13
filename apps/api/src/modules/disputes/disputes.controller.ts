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
import { createZodDto } from 'nestjs-zod';
import { SessionGuard, SellerGuard } from '../../common/guards/session.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SessionUser } from '../../common/guards/session.guard.js';
import {
  DisputesService,
  openDisputeSchema,
  respondDisputeSchema,
} from './disputes.service.js';

class OpenDisputeDto extends createZodDto(openDisputeSchema) {}
class RespondDisputeDto extends createZodDto(respondDisputeSchema) {}

@Controller('disputes')
@UseGuards(SessionGuard)
export class DisputesController {
  constructor(private readonly service: DisputesService) {}

  @Get()
  async listMine(@CurrentUser() user: SessionUser) {
    const data = await this.service.listByUser(user.id);
    return { data };
  }

  @Get(':id')
  async detail(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    const dispute = await this.service.findById(id);
    if (dispute.userId !== user.id) {
      return { data: null };
    }
    return { data: dispute };
  }

  @Post()
  @HttpCode(201)
  async open(@CurrentUser() user: SessionUser, @Body() body: OpenDisputeDto) {
    const data = await this.service.openByUser(user.id, body);
    return { data };
  }
}

@Controller('seller/disputes')
@UseGuards(SellerGuard)
export class SellerDisputesController {
  constructor(private readonly service: DisputesService) {}

  @Get()
  async list(@CurrentUser() user: SessionUser, @Query('status') status?: string) {
    const data = await this.service.listBySeller(user.sellerId!, status);
    return { data };
  }

  @Get(':id')
  async detail(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    const dispute = await this.service.findById(id);
    if (dispute.sellerId !== user.sellerId) {
      return { data: null };
    }
    return { data: dispute };
  }

  @Post(':id/respond')
  @HttpCode(200)
  async respond(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: RespondDisputeDto,
  ) {
    const data = await this.service.respondBySeller(user.sellerId!, id, body);
    return { data };
  }
}
