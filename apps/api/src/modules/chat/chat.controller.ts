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
import { SessionGuard } from '../../common/guards/session.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SessionUser } from '../../common/guards/session.guard.js';
import {
  ChatService,
  sendMessageSchema,
  startDirectThreadSchema,
  startOrderThreadSchema,
} from './chat.service.js';

class SendMessageDto extends createZodDto(sendMessageSchema) {}
class StartOrderThreadDto extends createZodDto(startOrderThreadSchema) {}
class StartDirectThreadDto extends createZodDto(startDirectThreadSchema) {}

@Controller('chat/threads')
@UseGuards(SessionGuard)
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Get()
  async list(@CurrentUser() user: SessionUser) {
    if (user.sellerId) {
      return { data: await this.service.listForSeller(user.sellerId) };
    }
    return { data: await this.service.listForUser(user.id) };
  }

  @Post('order')
  @HttpCode(201)
  async startOrderThread(@CurrentUser() user: SessionUser, @Body() body: StartOrderThreadDto) {
    const data = await this.service.startOrderThread(user.id, body.orderId);
    return { data };
  }

  @Post('direct')
  @HttpCode(201)
  async startDirectThread(@CurrentUser() user: SessionUser, @Body() body: StartDirectThreadDto) {
    const data = await this.service.startDirectThread(user.id, body.sellerId);
    return { data };
  }

  @Get(':id/messages')
  async messages(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Query('since') sinceMs?: string,
  ) {
    const requester = { userId: user.id, ...(user.sellerId ? { sellerId: user.sellerId } : {}) };
    const data = await this.service.listMessages(
      id,
      requester,
      sinceMs ? Number(sinceMs) : undefined,
    );
    return { data };
  }

  @Post(':id/messages')
  @HttpCode(201)
  async send(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: SendMessageDto,
  ) {
    const role = user.sellerId ? 'seller' : 'user';
    const requester = { userId: user.id, ...(user.sellerId ? { sellerId: user.sellerId } : {}) };
    const data = await this.service.sendMessage(id, requester, role, body);
    return { data };
  }

  @Post(':id/read')
  @HttpCode(200)
  async read(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    const role = user.sellerId ? 'seller' : 'user';
    const requester = { userId: user.id, ...(user.sellerId ? { sellerId: user.sellerId } : {}) };
    await this.service.markRead(id, requester, role);
    return { data: { read: true } };
  }
}
