import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { UserMediaController } from './user-media.controller.js';
import { UserMediaService } from './user-media.service.js';

@Module({
  imports: [AuthModule],
  controllers: [UserMediaController],
  providers: [UserMediaService, SessionGuard],
  exports: [UserMediaService],
})
export class UserMediaModule {}
