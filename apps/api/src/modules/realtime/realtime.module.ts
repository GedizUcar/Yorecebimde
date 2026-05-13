import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RealtimeService } from './realtime.service.js';

@Global()
@Module({
  imports: [AuthModule],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
