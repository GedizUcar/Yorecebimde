import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { CouponsController } from './coupons.controller.js';
import { CouponsService } from './coupons.service.js';

@Module({
  imports: [AuthModule],
  controllers: [CouponsController],
  providers: [CouponsService, SessionGuard],
  exports: [CouponsService],
})
export class CouponsModule {}
