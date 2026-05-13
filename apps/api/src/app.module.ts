import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { HealthModule } from './modules/health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { SellersModule } from './modules/sellers/sellers.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { WishlistModule } from './modules/wishlist/wishlist.module.js';
import { AddressesModule } from './modules/addresses/addresses.module.js';
import { CartModule } from './modules/cart/cart.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { InvoicingModule } from './modules/invoicing/invoicing.module.js';
import { CronModule } from './modules/cron/cron.module.js';
// Faz 4
import { SellerApplicationsModule } from './modules/seller-applications/seller-applications.module.js';
import { DisputesModule } from './modules/disputes/disputes.module.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { ShippingModule } from './modules/shipping/shipping.module.js';
import { BoostModule } from './modules/boost/boost.module.js';
// Faz 4.2
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { SellerReportsModule } from './modules/seller-reports/seller-reports.module.js';
// Faz 5
import { AdminModule } from './modules/admin/admin.module.js';
// Faz 6
import { LoyaltyModule } from './modules/loyalty/loyalty.module.js';
import { ReferralModule } from './modules/referral/referral.module.js';
import { CouponsModule } from './modules/coupons/coupons.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { QuestionsModule } from './modules/questions/questions.module.js';
// Faz 6.2
import { BotModule } from './modules/bot/bot.module.js';
// Faz 7
import { KvkkUserModule } from './modules/kvkk-user/kvkk-user.module.js';
import { TwoFaModule } from './modules/two-fa/two-fa.module.js';
import { PushModule } from './modules/push/push.module.js';
import { ContractsModule } from './modules/contracts/contracts.module.js';
import { EtbisModule } from './modules/etbis/etbis.module.js';
import { UserMediaModule } from './modules/user-media/user-media.module.js';
import { DatabaseModule } from './infrastructure/database.module.js';
import { MinioModule } from './infrastructure/minio.module.js';
import { QueueModule } from './infrastructure/queue.module.js';
import { MeilisearchModule } from './infrastructure/meilisearch.module.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor.js';

@Module({
  imports: [
    DatabaseModule,
    MinioModule,
    QueueModule,
    MeilisearchModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AuditModule,
    CategoriesModule,
    ProductsModule,
    SellersModule,
    UploadsModule,
    SearchModule,
    WishlistModule,
    AddressesModule,
    NotificationsModule,
    InvoicingModule,
    PaymentsModule,
    CartModule,
    OrdersModule,
    CronModule,
    // Faz 4
    ShippingModule,
    SellerApplicationsModule,
    DisputesModule,
    RealtimeModule,
    ChatModule,
    BoostModule,
    SellerReportsModule,
    AdminModule,
    // Faz 6
    LoyaltyModule,
    ReferralModule,
    CouponsModule,
    ReviewsModule,
    QuestionsModule,
    BotModule,
    KvkkUserModule,
    TwoFaModule,
    PushModule,
    ContractsModule,
    EtbisModule,
    UserMediaModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, TenantContextMiddleware).forRoutes('*');
  }
}
