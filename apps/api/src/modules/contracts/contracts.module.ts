import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { ContractsController } from './contracts.controller.js';
import { ContractsService } from './contracts.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ContractsController],
  providers: [ContractsService, SessionGuard],
  exports: [ContractsService],
})
export class ContractsModule {}
