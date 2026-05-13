import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { PushController } from './push.controller.js';
import { PushService } from './push.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PushController],
  providers: [PushService, SessionGuard],
  exports: [PushService],
})
export class PushModule {}
