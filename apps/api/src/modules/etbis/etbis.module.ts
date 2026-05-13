import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { EtbisController } from './etbis.controller.js';
import { EtbisService } from './etbis.service.js';

@Module({
  imports: [AuthModule],
  controllers: [EtbisController],
  providers: [EtbisService, SessionGuard],
  exports: [EtbisService],
})
export class EtbisModule {}
