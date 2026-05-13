import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from 'prom-client';

/**
 * Prometheus registry — process-level + HTTP request metrics.
 *
 * Default metrics: heap, GC, event loop lag, CPU.
 * Custom: http_requests_total, http_request_duration_seconds.
 *
 * Faz 8: DB pool exporter, BullMQ queue depth.
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  readonly httpRequestsTotal = new Counter({
    name: 'yorecebimde_http_requests_total',
    help: 'Total HTTP requests by route + method + status',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [this.registry],
  });

  readonly httpDuration = new Histogram({
    name: 'yorecebimde_http_request_duration_seconds',
    help: 'HTTP request duration by route + method',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.registry],
  });

  readonly orderCreatedTotal = new Counter({
    name: 'yorecebimde_orders_created_total',
    help: 'Sipariş oluşturma sayısı (business KPI)',
    labelNames: ['seller_id'] as const,
    registers: [this.registry],
  });

  readonly botFunctionCalls = new Counter({
    name: 'yorecebimde_bot_function_calls_total',
    help: 'AI bot function call sayısı',
    labelNames: ['function', 'success'] as const,
    registers: [this.registry],
  });

  onModuleInit() {
    this.registry.setDefaultLabels({ service: 'yorecebimde-api' });
    collectDefaultMetrics({ register: this.registry });
  }

  async scrape(): Promise<string> {
    return this.registry.metrics();
  }
}
