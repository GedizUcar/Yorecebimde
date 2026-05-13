import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard, SellerGuard } from '../../common/guards/session.guard.js';
import { DisputesController, SellerDisputesController } from './disputes.controller.js';
import { DisputesService } from './disputes.service.js';

@Module({
  imports: [AuthModule],
  controllers: [DisputesController, SellerDisputesController],
  providers: [DisputesService, SessionGuard, SellerGuard],
  exports: [DisputesService],
})
export class DisputesModule {}
