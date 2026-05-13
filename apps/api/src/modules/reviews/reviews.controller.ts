import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard, type SessionUser } from '../../common/guards/session.guard.js';
import { ReviewsService } from './reviews.service.js';

const createSchema = z.object({
  orderItemId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional().nullable(),
  photos: z.array(z.string().url()).max(6).default([]),
});
class CreateDto extends createZodDto(createSchema) {}

const replySchema = z.object({ text: z.string().min(2).max(2000) });
class ReplyDto extends createZodDto(replySchema) {}

/** Müşteri yorum endpoint'leri. */
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly svc: ReviewsService) {}

  /** Public — ürün yorumları */
  @Get('product/:productId')
  async listByProduct(
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: 'newest' | 'highest' | 'lowest',
  ) {
    return {
      data: await this.svc.listByProduct(productId, Number(limit) || 20, sort ?? 'newest'),
    };
  }

  @Get('reviewable')
  @UseGuards(SessionGuard)
  async reviewable(@CurrentUser() user: SessionUser) {
    return { data: await this.svc.listReviewableForUser(user.id) };
  }

  @Post()
  @UseGuards(SessionGuard)
  async create(@CurrentUser() user: SessionUser, @Body() body: CreateDto) {
    return {
      data: await this.svc.createForOrderItem(
        user.id,
        body.orderItemId,
        body.rating,
        body.body ?? null,
        body.photos,
      ),
    };
  }
}

const adminHideSchema = z.object({ reason: z.string().min(10).max(500) });
class AdminHideDto extends createZodDto(adminHideSchema) {}

/** Admin moderasyon endpoint'leri. */
@Controller('admin/reviews')
@UseGuards(SessionGuard)
export class AdminReviewsController {
  constructor(private readonly svc: ReviewsService) {}

  @Get()
  async list(
    @CurrentUser() user: SessionUser,
    @Query('status') status?: 'visible' | 'hidden_by_admin' | 'removed_by_user',
    @Query('limit') limit?: string,
  ) {
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return { data: [] };
    }
    return {
      data: await this.svc.adminList({
        ...(status ? { status } : {}),
        limit: limit ? Number(limit) : 100,
      }),
    };
  }

  @Post(':id/hide')
  async hide(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: AdminHideDto,
  ) {
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return { data: { ok: false } };
    }
    await this.svc.adminHide(id, body.reason);
    return { data: { ok: true } };
  }

  @Post(':id/restore')
  async restore(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return { data: { ok: false } };
    }
    await this.svc.adminRestore(id);
    return { data: { ok: true } };
  }
}

/** Satıcı yorum endpoint'leri (cevap + bekleyenler). */
@Controller('seller/reviews')
@UseGuards(SessionGuard)
export class SellerReviewsController {
  constructor(private readonly svc: ReviewsService) {}

  @Get('pending')
  async pending(@CurrentUser() user: SessionUser) {
    if (!user.sellerId) return { data: [] };
    return { data: await this.svc.sellerPendingReviews(user.sellerId) };
  }

  @Post(':id/reply')
  async reply(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: ReplyDto,
  ) {
    if (!user.sellerId) return { data: { ok: false } };
    return { data: await this.svc.sellerReply(id, user.sellerId, body.text) };
  }
}
