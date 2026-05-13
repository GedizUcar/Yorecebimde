import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { MetricsService } from '../../modules/health/metrics.service.js';

/**
 * Her HTTP request için Prometheus counter + histogram günceller.
 * Route normalize edilir (UUID/sayısal ID'ler `:id` ile değiştirilir) cardinality azaltır.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<FastifyRequest>();
    const res = http.getResponse<FastifyReply>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.record(req, res, start),
        error: () => this.record(req, res, start),
      }),
    );
  }

  private record(req: FastifyRequest, res: FastifyReply, start: number) {
    const ms = (Date.now() - start) / 1000;
    const route = normalizeRoute(req.routeOptions?.url ?? req.url);
    const labels = {
      method: req.method,
      route,
      status: String(res.statusCode),
    };
    this.metrics.httpRequestsTotal.labels(labels).inc();
    this.metrics.httpDuration.labels(labels).observe(ms);
  }
}

/** UUID v7 + sayısal ID'leri `:id` ile değiştir, cardinality patlamasını önle. */
function normalizeRoute(url: string): string {
  // Query string'i at
  const path = url.split('?')[0] ?? url;
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d{4,}/g, '/:id');
}
