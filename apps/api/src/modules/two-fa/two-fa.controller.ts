import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { and, eq, isNull } from 'drizzle-orm';
import { users } from '@yorecebimde/db/schema';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard, type SessionUser } from '../../common/guards/session.guard.js';
import { AuthService } from '../auth/auth.service.js';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

/**
 * 2FA durum endpoint'i — frontend banner için. Better-Auth twoFactor plugin
 * `users.twoFaEnabled` field'ını günceller. Setup/verify endpoint'leri
 * Better-Auth otomatik açar (catch-all `/api/auth/*` üzerinden):
 *   POST /api/auth/two-factor/enable
 *   POST /api/auth/two-factor/verify-totp
 *   POST /api/auth/two-factor/generate-backup-codes
 *
 * Enforce kuralı: seller/admin/super_admin role'lerinde 2FA zorunlu.
 */
@Controller('2fa')
@UseGuards(SessionGuard)
export class TwoFaController {
  constructor(
    @Inject(DB_TOKEN) private readonly db: DbToken,
    private readonly authService: AuthService,
  ) {}

  @Get('status')
  async status(@CurrentUser() user: SessionUser, @Req() req: FastifyRequest) {
    const enforced = ['seller', 'admin', 'super_admin'].includes(user.role);

    let enabled = false;
    try {
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === 'string') headers.set(k, v);
      }
      const session = await this.authService.auth.api.getSession({ headers });
      const authUserRecord = session?.user as { twoFactorEnabled?: boolean } | undefined;
      if (authUserRecord?.twoFactorEnabled) enabled = true;
    } catch {
      // sessionsuz → enabled=false
    }

    if (!enabled) {
      const [u] = await this.db
        .select({ twoFa: users.twoFaEnabled })
        .from(users)
        .where(and(eq(users.id, user.id), isNull(users.deletedAt)))
        .limit(1);
      if (u?.twoFa) enabled = true;
    }

    return {
      data: {
        enabled,
        enforced,
        role: user.role,
        gracePeriodDays: 30,
      },
    };
  }
}
