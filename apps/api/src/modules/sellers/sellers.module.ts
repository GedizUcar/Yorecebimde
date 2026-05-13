import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard, SellerGuard } from '../../common/guards/session.guard.js';
import { SellersController } from './sellers.controller.js';
import { SellerStoreController } from './seller-store.controller.js';
import { SellersRepository } from './sellers.repository.js';
import { SellerStoreService } from './seller-store.service.js';

@Module({
  imports: [AuthModule],
  controllers: [SellersController, SellerStoreController],
  providers: [SellersRepository, SellerStoreService, SessionGuard, SellerGuard],
  exports: [SellersRepository],
})
export class SellersModule {}
