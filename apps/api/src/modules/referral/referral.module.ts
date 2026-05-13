import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LoyaltyModule } from '../loyalty/loyalty.module.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { ReferralController } from './referral.controller.js';
import { ReferralService } from './referral.service.js';

@Module({
  imports: [AuthModule, LoyaltyModule],
  controllers: [ReferralController],
  providers: [ReferralService, SessionGuard],
  exports: [ReferralService],
})
export class ReferralModule {}
