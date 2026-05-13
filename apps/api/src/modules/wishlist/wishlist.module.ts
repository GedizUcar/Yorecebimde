import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { WishlistController } from './wishlist.controller.js';
import { WishlistRepository } from './wishlist.repository.js';

@Module({
  imports: [AuthModule],
  controllers: [WishlistController],
  providers: [WishlistRepository, SessionGuard],
  exports: [WishlistRepository],
})
export class WishlistModule {}
