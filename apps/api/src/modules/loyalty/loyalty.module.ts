import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { LoyaltyController } from './loyalty.controller.js';
import { LoyaltyService } from './loyalty.service.js';

@Module({
  imports: [AuthModule],
  controllers: [LoyaltyController],
  providers: [LoyaltyService, SessionGuard],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
