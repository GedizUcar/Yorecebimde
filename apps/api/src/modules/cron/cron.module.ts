import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module.js';
import { DisputesModule } from '../disputes/disputes.module.js';
import { ProductsModule } from '../products/products.module.js';
import { LoyaltyModule } from '../loyalty/loyalty.module.js';
import { BoostModule } from '../boost/boost.module.js';
import { CronService } from './cron.service.js';

@Module({
  imports: [OrdersModule, DisputesModule, ProductsModule, LoyaltyModule, BoostModule],
  providers: [CronService],
})
export class CronModule {}
