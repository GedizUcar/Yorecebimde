import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SearchModule } from '../search/search.module.js';
import { BoostModule } from '../boost/boost.module.js';
import { SessionGuard, SellerGuard } from '../../common/guards/session.guard.js';
import { ProductsController } from './products.controller.js';
import { SellerProductsController } from './seller-products.controller.js';
import { VariationsController } from './variations.controller.js';
import { DiscountsController } from './discounts.controller.js';
import { StockController } from './stock.controller.js';
import { ProductsRepository } from './products.repository.js';
import { SellerProductsService } from './seller-products.service.js';
import { VariationsService } from './variations.service.js';
import { DiscountsService } from './discounts.service.js';
import { StockService } from './stock.service.js';

@Module({
  imports: [AuthModule, SearchModule, BoostModule],
  controllers: [
    ProductsController,
    SellerProductsController,
    VariationsController,
    DiscountsController,
    StockController,
  ],
  providers: [
    ProductsRepository,
    SellerProductsService,
    VariationsService,
    DiscountsService,
    StockService,
    SessionGuard,
    SellerGuard,
  ],
  exports: [ProductsRepository, StockService],
})
export class ProductsModule {}
