import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { AddressesController } from './addresses.controller.js';
import { AddressesService } from './addresses.service.js';
import { AddressesRepository } from './addresses.repository.js';

@Module({
  imports: [AuthModule],
  controllers: [AddressesController],
  providers: [AddressesService, AddressesRepository, SessionGuard],
  exports: [AddressesService, AddressesRepository],
})
export class AddressesModule {}
