import { Global, Module, forwardRef } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module.js';
import { IyzicoProvider } from './iyzico.provider.js';
import { PaymentsService } from './payments.service.js';
import { PaymentsWebhookController } from './payments.controller.js';

@Global()
@Module({
  imports: [forwardRef(() => OrdersModule)],
  controllers: [PaymentsWebhookController],
  providers: [IyzicoProvider, PaymentsService],
  exports: [IyzicoProvider, PaymentsService],
})
export class PaymentsModule {}
