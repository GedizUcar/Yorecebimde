import { Global, Module } from '@nestjs/common';
import { NilveraProvider } from './nilvera.provider.js';
import { InvoicingService } from './invoicing.service.js';

@Global()
@Module({
  providers: [NilveraProvider, InvoicingService],
  exports: [NilveraProvider, InvoicingService],
})
export class InvoicingModule {}
