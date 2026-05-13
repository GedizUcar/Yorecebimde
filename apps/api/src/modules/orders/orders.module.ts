import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AddressesModule } from '../addresses/addresses.module.js';
import { CartModule } from '../cart/cart.module.js';
import { ProductsModule } from '../products/products.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { LoyaltyModule } from '../loyalty/loyalty.module.js';
import { ReferralModule } from '../referral/referral.module.js';
import { CouponsModule } from '../coupons/coupons.module.js';
import { SessionGuard, SellerGuard } from '../../common/guards/session.guard.js';
import {
  OrdersController,
  SellerOrdersController,
} from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { OrdersRepository } from './orders.repository.js';

@Module({
  imports: [
    AuthModule,
    AddressesModule,
    CartModule,
    ProductsModule,
    forwardRef(() => PaymentsModule),
    LoyaltyModule,
    ReferralModule,
    CouponsModule,
  ],
  controllers: [OrdersController, SellerOrdersController],
  providers: [OrdersService, OrdersRepository, SessionGuard, SellerGuard],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
