import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard, type SessionUser } from '../../common/guards/session.guard.js';
import { ForbiddenError } from '@yorecebimde/shared';
import { EtbisService } from './etbis.service.js';

@Controller('admin/etbis')
@UseGuards(SessionGuard)
export class EtbisController {
  constructor(private readonly svc: EtbisService) {}

  private assertAdmin(user: SessionUser) {
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new ForbiddenError();
    }
  }

  @Get('monthly')
  async monthly(
    @CurrentUser() user: SessionUser,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    this.assertAdmin(user);
    const now = new Date();
    const y = year ? Number(year) : now.getFullYear();
    const m = month ? Number(month) : now.getMonth() + 1;
    return { data: await this.svc.monthlySummary(y, m) };
  }

  @Get('last-12-months')
  async last12(@CurrentUser() user: SessionUser) {
    this.assertAdmin(user);
    return { data: await this.svc.lastTwelveMonths() };
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="etbis-12ay.csv"')
  async exportCsv(@CurrentUser() user: SessionUser) {
    this.assertAdmin(user);
    const rows = await this.svc.lastTwelveMonths();
    return this.svc.toCsv(rows);
  }
}
