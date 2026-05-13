import { Controller, Get, Header, Query, UseGuards, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Res as ResDeco } from '@nestjs/common';
import { SellerGuard } from '../../common/guards/session.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SessionUser } from '../../common/guards/session.guard.js';
import { SellerReportsService } from './seller-reports.service.js';

void ResDeco;

@Controller('seller/reports')
@UseGuards(SellerGuard)
export class SellerReportsController {
  constructor(private readonly service: SellerReportsService) {}

  @Get('kpis')
  async kpis(@CurrentUser() user: SessionUser) {
    const data = await this.service.kpis(user.sellerId!);
    return { data };
  }

  @Get('sales')
  async sales(
    @CurrentUser() user: SessionUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.service.sales(user.sellerId!, {
      ...(from ? { from: new Date(from) } : {}),
      ...(to ? { to: new Date(to) } : {}),
      ...(status ? { status } : {}),
    });
    return { data };
  }

  @Get('sales/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="sales-report.csv"')
  async exportCsv(
    @CurrentUser() user: SessionUser,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    const csv = await this.service.exportCsv(user.sellerId!, {
      ...(from ? { from: new Date(from) } : {}),
      ...(to ? { to: new Date(to) } : {}),
      ...(status ? { status } : {}),
    });
    void reply;
    return csv;
  }
}
