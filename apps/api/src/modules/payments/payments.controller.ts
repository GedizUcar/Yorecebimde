import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { OrdersService } from '../orders/orders.service.js';

const callbackSchema = z.object({
  token: z.string().min(5),
});
class CallbackDto extends createZodDto(callbackSchema) {}

/**
 * Iyzico callback endpoint. Gerçek hayatta Iyzico → bu endpoint'e POST eder.
 * Faz 3.1 stub: web tarafındaki mock sayfa "Onayla" tıklanınca buraya POST atar.
 */
@Controller('webhooks/iyzico')
export class PaymentsWebhookController {
  constructor(private readonly orders: OrdersService) {}

  @Post('callback')
  @HttpCode(200)
  async callback(@Body() body: CallbackDto) {
    const result = await this.orders.handlePaymentCallback(body.token);
    return { data: result };
  }
}
