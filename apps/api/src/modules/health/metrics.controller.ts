import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service.js';

/**
 * Prometheus scrape endpoint. Format: Prometheus text exposition v0.0.4.
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async scrape(): Promise<string> {
    return this.metrics.scrape();
  }
}
