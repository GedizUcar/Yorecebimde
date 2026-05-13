import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { TwoFaController } from './two-fa.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [TwoFaController],
  providers: [SessionGuard],
})
export class TwoFaModule {}
