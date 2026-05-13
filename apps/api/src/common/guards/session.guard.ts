import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { and, eq, isNull } from 'drizzle-orm';
import { sellers, users } from '@yorecebimde/db/schema';
import { AuthRequiredError, ForbiddenError } from '@yorecebimde/shared';
import { AuthService } from '../../modules/auth/auth.service.js';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

export type SessionUser = {
  id: string;
  authUserId: string;
  email: string;
  role: 'customer' | 'seller' | 'admin' | 'super_admin';
  sellerId: string | null;
};

declare module 'fastify' {
  interface FastifyRequest {
    user?: SessionUser;
  }
}

/**
 * Better-Auth session cookie'sini doğrular → users + sellers tablolarından
 * domain user'ı çeker → req.user'a yazar.
 *
 * TenantContextMiddleware bu işten sonra GUC değişkenlerini güncelliyor;
 * sıralama önemli: guard middleware'den önce çalışmaz, dolayısıyla bu
 * endpoint'lerde RLS context guard çalıştıktan sonra geçerli olur. Faz 3'te
 * Better-Auth session'ı middleware seviyesine taşıyacağız.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    @Inject(DB_TOKEN) private readonly db: DbToken,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') headers.set(k, v);
      else if (Array.isArray(v)) headers.set(k, v.join(','));
    }
    const session = await this.authService.auth.api.getSession({ headers });
    if (!session?.user) throw new AuthRequiredError('Oturum gerekli');

    const userRows = await this.db
      .select()
      .from(users)
      .where(and(eq(users.authUserId, session.user.id), isNull(users.deletedAt)))
      .limit(1);
    const user = userRows[0];
    if (!user) throw new AuthRequiredError('Kullanıcı bulunamadı');

    let sellerId: string | null = null;
    if (user.role === 'seller') {
      const sellerRows = await this.db
        .select({ id: sellers.id })
        .from(sellers)
        .where(and(eq(sellers.userId, user.id), isNull(sellers.deletedAt)))
        .limit(1);
      sellerId = sellerRows[0]?.id ?? null;
    }

    req.user = {
      id: user.id,
      authUserId: user.authUserId,
      email: user.email,
      role: user.role,
      sellerId,
    };
    return true;
  }
}

/** SessionGuard + seller role gereği. */
@Injectable()
export class SellerGuard implements CanActivate {
  constructor(private readonly session: SessionGuard) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    await this.session.canActivate(ctx);
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    if (req.user?.role !== 'seller' || !req.user.sellerId) {
      throw new ForbiddenError('Satıcı yetkisi gerekli');
    }
    return true;
  }
}
