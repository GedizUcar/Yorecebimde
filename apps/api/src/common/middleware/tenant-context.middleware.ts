import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { setTenantContext } from '@yorecebimde/db';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

/**
 * Her HTTP request başında Postgres GUC değişkenlerini set eder.
 * RLS policy'ler `current_setting('app.current_seller_id')` üzerinden çalışır.
 *
 * NOT: Bu middleware **session-level** set yapıyor (transaction-level değil) çünkü
 * her endpoint kendi transaction'unu açıyor. Tam doğru pattern, route handler'larda
 * `db.transaction()` içinde `SET LOCAL` çağırmak. Faz 2'de Repository pattern ile
 * o seviyeye geçeceğiz.
 *
 * Faz 1'de auth bilgisini henüz set etmiyoruz (AuthGuard sonradan eklenince context
 * `req.user`'dan okunacak); şimdilik default guest.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  async use(
    req: FastifyRequest['raw'] & { user?: { id: string; role: string; sellerId?: string } },
    _res: FastifyReply['raw'],
    next: () => void,
  ) {
    const u = req.user;
    try {
      await this.db.execute(
        setTenantContext({
          userId: u?.id ?? null,
          sellerId: u?.sellerId ?? null,
          role: u?.role ?? 'guest',
        }),
      );
    } catch {
      // Connection kaybı vs. — global filter yakalayacak
    }
    next();
  }
}
