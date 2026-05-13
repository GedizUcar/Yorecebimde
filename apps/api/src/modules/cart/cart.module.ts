import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';
import { CartRepository } from './cart.repository.js';

@Module({
  imports: [AuthModule],
  controllers: [CartController],
  providers: [CartService, CartRepository, SessionGuard],
  exports: [CartService, CartRepository],
})
export class CartModule {}
