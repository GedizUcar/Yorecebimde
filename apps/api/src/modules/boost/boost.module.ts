import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard, SellerGuard } from '../../common/guards/session.guard.js';
import { BoostController } from './boost.controller.js';
import { BoostService } from './boost.service.js';
import { BoostListingService } from './boost-listing.service.js';
import { BoostTrackController } from './boost-track.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [BoostController, BoostTrackController],
  providers: [BoostService, BoostListingService, SessionGuard, SellerGuard],
  exports: [BoostService, BoostListingService],
})
export class BoostModule {}
