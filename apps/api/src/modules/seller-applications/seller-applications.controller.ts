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
import { ForbiddenError } from '@yorecebimde/shared';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SessionUser } from '../../common/guards/session.guard.js';
import {
  SellerApplicationsService,
  createApplicationSchema,
  reviewSchema,
} from './seller-applications.service.js';

class CreateApplicationDto extends createZodDto(createApplicationSchema) {}
class ReviewDto extends createZodDto(reviewSchema) {}

const redeemSchema = z.object({ token: z.string().min(20) });
class RedeemDto extends createZodDto(redeemSchema) {}

const completeRedeemSchema = z.object({ token: z.string().min(20) });
class CompleteRedeemDto extends createZodDto(completeRedeemSchema) {}

@Controller('sellers/applications')
export class SellerApplicationsController {
  constructor(private readonly service: SellerApplicationsService) {}

  @Post()
  @HttpCode(201)
  async apply(@Body() body: CreateApplicationDto) {
    const data = await this.service.apply(body);
    return { data };
  }

  @Get(':id')
  async status(@Param('id') id: string) {
    const data = await this.service.findById(id);
    // Maskeli: sadece status + reviewNotes + displayName publike
    return {
      data: {
        id: data.id,
        status: data.status,
        displayName: data.displayName,
        reviewNotes: data.reviewNotes,
        createdAt: data.createdAt,
        reviewedAt: data.reviewedAt,
      },
    };
  }
}

@Controller('sellers/invites')
export class SellerInvitesController {
  constructor(private readonly service: SellerApplicationsService) {}

  @Post('redeem')
  @HttpCode(200)
  async redeem(@Body() body: RedeemDto) {
    const data = await this.service.redeemInvite({
      token: body.token,
      password: '', // password Better-Auth signUp tarafında alınacak
    });
    return { data };
  }

  @Post('complete')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  async complete(@CurrentUser() user: SessionUser, @Body() body: CompleteRedeemDto) {
    const data = await this.service.completeRedeem({
      token: body.token,
      userDomainId: user.id,
    });
    return { data };
  }
}

@Controller('admin/sellers/applications')
@UseGuards(SessionGuard)
export class AdminSellerApplicationsController {
  constructor(private readonly service: SellerApplicationsService) {}

  @Get()
  async list(
    @CurrentUser() user: SessionUser,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.assertAdmin(user);
    const data = await this.service.listForAdmin(
      status,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
    return { data };
  }

  @Get(':id')
  async detail(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    this.assertAdmin(user);
    const data = await this.service.findById(id);
    return { data };
  }

  @Post(':id/approve')
  @HttpCode(200)
  async approve(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: ReviewDto,
  ) {
    this.assertAdmin(user);
    const data = await this.service.approve(id, user.id, body.notes);
    return { data };
  }

  @Post(':id/reject')
  @HttpCode(200)
  async reject(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: ReviewDto,
  ) {
    this.assertAdmin(user);
    const data = await this.service.reject(id, user.id, body.notes);
    return { data };
  }

  private assertAdmin(user: SessionUser) {
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new ForbiddenError('Admin yetkisi gerekli');
    }
  }
}
