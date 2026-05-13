import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { KvkkUserController } from './kvkk-user.controller.js';
import { KvkkUserService } from './kvkk-user.service.js';

@Module({
  imports: [AuthModule],
  controllers: [KvkkUserController],
  providers: [KvkkUserService, SessionGuard],
  exports: [KvkkUserService],
})
export class KvkkUserModule {}
