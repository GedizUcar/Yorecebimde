import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CartModule } from '../cart/cart.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { ProductsModule } from '../products/products.module.js';
import { BotController } from './bot.controller.js';
import { BotService } from './bot.service.js';
import { BotFunctionsService } from './bot-functions.service.js';

@Module({
  imports: [AuthModule, CartModule, OrdersModule, ProductsModule],
  controllers: [BotController],
  providers: [BotService, BotFunctionsService],
  exports: [BotService],
})
export class BotModule {}
