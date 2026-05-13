import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { UsersController } from './users.controller.js';
import { UsersRepository } from './users.repository.js';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersRepository, SessionGuard],
  exports: [UsersRepository],
})
export class UsersModule {}
