import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard, SellerGuard } from '../../common/guards/session.guard.js';
import { SellerReportsController } from './seller-reports.controller.js';
import { SellerReportsService } from './seller-reports.service.js';

@Module({
  imports: [AuthModule],
  controllers: [SellerReportsController],
  providers: [SellerReportsService, SessionGuard, SellerGuard],
  exports: [SellerReportsService],
})
export class SellerReportsModule {}
