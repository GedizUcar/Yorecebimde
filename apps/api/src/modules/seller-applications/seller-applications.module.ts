import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import {
  SellerApplicationsController,
  SellerInvitesController,
  AdminSellerApplicationsController,
} from './seller-applications.controller.js';
import { SellerApplicationsService } from './seller-applications.service.js';

@Module({
  imports: [AuthModule],
  controllers: [
    SellerApplicationsController,
    SellerInvitesController,
    AdminSellerApplicationsController,
  ],
  providers: [SellerApplicationsService, SessionGuard],
  exports: [SellerApplicationsService],
})
export class SellerApplicationsModule {}
