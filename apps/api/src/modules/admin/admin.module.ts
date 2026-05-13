import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { AdminExtrasController, KvkkPublicController } from './admin-extras.controller.js';
import { AdminExtrasService } from './admin-extras.service.js';

@Module({
  imports: [AuthModule, PaymentsModule],
  controllers: [AdminController, AdminExtrasController, KvkkPublicController],
  providers: [AdminService, AdminExtrasService, SessionGuard],
  exports: [AdminService, AdminExtrasService],
})
export class AdminModule {}
