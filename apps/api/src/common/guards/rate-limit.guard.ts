import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Redis } from 'ioredis';
import type { FastifyRequest } from 'fastify';
import { BusinessRuleError } from '@yorecebimde/shared';
import { REDIS_TOKEN } from '../../infrastructure/queue.module.js';

export const RATE_LIMIT_KEY = 'rate_limit';

export type RateLimitConfig = {
  /** Max isteke 1 window içinde. */
  max: number;
  /** Window saniye cinsinden. */
  windowSeconds: number;
  /** Custom key fonksiyonu (default: user ID > IP). */
  keyBy?: 'user' | 'ip';
};

export const RateLimit = (config: RateLimitConfig) => SetMetadata(RATE_LIMIT_KEY, config);

/**
 * Endpoint başına Redis sliding window rate limit.
 *
 * Sorted set ile timestamp tracking — her request ZADD ile eklenir, eskiler
 * ZREMRANGEBYSCORE ile temizlenir, ZCARD ile sayım yapılır. Atomik bir Lua
 * pipeline ile race condition'a açık değil.
 *
 * Key pattern: `rl:{route}:{identityKey}` — TTL = windowSeconds.
 *
 * Decorator:
 *   @RateLimit({ max: 5, windowSeconds: 3600, keyBy: 'user' })
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const config = this.reflector.getAllAndOverride<RateLimitConfig | undefined>(
      RATE_LIMIT_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!config) return true;

    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const route = `${req.method}:${req.routeOptions?.url ?? req.url}`;
    const id =
      config.keyBy === 'ip' || !req.user
        ? `ip:${req.ip ?? 'anon'}`
        : `user:${req.user.id}`;
    const key = `rl:${route}|${id}`;
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;
    const windowStart = now - windowMs;

    // Atomik: eskileri sil + bu request'i ekle + sayımı al + TTL set
    const pipeline = this.redis.multi();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.expire(key, config.windowSeconds);
    const results = await pipeline.exec();
    if (!results) return true; // Redis hatası → fail-open (rate limit cilanması daha kötü)

    const countResult = results[2];
    const count = Array.isArray(countResult) ? Number(countResult[1] ?? 0) : 0;

    if (count > config.max) {
      // Bu request'i geri çıkar (count++ olmuş çünkü zadd ettik)
      await this.redis.zremrangebyrank(key, -1, -1).catch(() => undefined);
      const ttl = await this.redis.ttl(key).catch(() => config.windowSeconds);
      throw new BusinessRuleError(
        `Çok fazla istek. ${ttl}s sonra tekrar deneyin.`,
        { retryAfter: ttl, max: config.max, windowSeconds: config.windowSeconds },
      );
    }
    return true;
  }
}
