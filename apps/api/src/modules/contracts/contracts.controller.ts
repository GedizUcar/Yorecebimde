import { Controller, Get, Header, Param, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard, type SessionUser } from '../../common/guards/session.guard.js';
import { ContractsService } from './contracts.service.js';

/**
 * Mesafeli satış sözleşmesi PDF endpoint'i. Server-side render (pdfkit).
 * Browser doğrudan indirir.
 */
@Controller('orders')
@UseGuards(SessionGuard)
export class ContractsController {
  constructor(private readonly svc: ContractsService) {}

  @Get(':orderNo/sozlesme.pdf')
  @Header('Content-Type', 'application/pdf')
  async pdf(
    @CurrentUser() user: SessionUser,
    @Param('orderNo') orderNo: string,
    @Res({ passthrough: false }) res: FastifyReply,
  ) {
    const buffer = await this.svc.generateMesafeliSatisPdf(user.id, orderNo);
    res.header(
      'Content-Disposition',
      `inline; filename="sozlesme-${orderNo}.pdf"`,
    );
    res.header('Content-Length', String(buffer.length));
    return res.send(buffer);
  }
}
