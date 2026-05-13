import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard, type SessionUser } from '../../common/guards/session.guard.js';
import { QuestionsService } from './questions.service.js';

const askSchema = z.object({
  productId: z.string().uuid(),
  body: z.string().min(5).max(1000),
});
class AskDto extends createZodDto(askSchema) {}

const answerSchema = z.object({
  answer: z.string().min(2).max(2000),
  isPublic: z.boolean().default(true),
});
class AnswerDto extends createZodDto(answerSchema) {}

@Controller('questions')
export class QuestionsController {
  constructor(private readonly svc: QuestionsService) {}

  /** Public — ürün Q&A listesi */
  @Get('product/:productId')
  async listByProduct(
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
  ) {
    return { data: await this.svc.listPublic(productId, Number(limit) || 20) };
  }

  @Post()
  @UseGuards(SessionGuard)
  async ask(@CurrentUser() user: SessionUser, @Body() body: AskDto) {
    return { data: await this.svc.ask(user.id, body.productId, body.body) };
  }
}

@Controller('seller/questions')
@UseGuards(SessionGuard)
export class SellerQuestionsController {
  constructor(private readonly svc: QuestionsService) {}

  @Get('pending')
  async pending(@CurrentUser() user: SessionUser) {
    if (!user.sellerId) return { data: [] };
    return { data: await this.svc.listPendingForSeller(user.sellerId) };
  }

  @Post(':id/answer')
  async answer(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: AnswerDto,
  ) {
    if (!user.sellerId) return { data: { ok: false } };
    return {
      data: await this.svc.sellerAnswer(user.sellerId, user.id, id, body.answer, body.isPublic),
    };
  }
}
