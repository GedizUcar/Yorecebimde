import { Global, Module } from '@nestjs/common';
import { ShippingService } from './shipping.service.js';

@Global()
@Module({
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
