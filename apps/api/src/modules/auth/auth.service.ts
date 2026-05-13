import { Inject, Injectable } from '@nestjs/common';
import { createAuth, type Auth } from '@yorecebimde/auth';
import { env } from '@yorecebimde/config/api';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

@Injectable()
export class AuthService {
  readonly auth: Auth;

  constructor(@Inject(DB_TOKEN) db: DbToken) {
    // Cookie domain — BETTER_AUTH_URL host'unun root domain'ini çıkar
    // örn. https://yorecebimde-staging.gkteches.com → .yorecebimde-staging.gkteches.com
    const cookieDomain = computeCookieDomain(env.BETTER_AUTH_URL);
    const trustedOrigins = [env.BETTER_AUTH_URL];
    // API subdomain'i de trusted origins'e ekle (web → api cross-origin fetch için)
    try {
      const u = new URL(env.BETTER_AUTH_URL);
      trustedOrigins.push(`${u.protocol}//api.${u.host}`);
    } catch {
      // ignore
    }
    this.auth = createAuth({
      db,
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.BETTER_AUTH_URL,
      sessionMaxAgeDays: env.SESSION_MAX_AGE_DAYS,
      cookieName: env.SESSION_COOKIE_NAME,
      trustedOrigins,
      ...(cookieDomain ? { cookieDomain } : {}),
    });
  }
}

/**
 * URL'den cookie domain çıkarır:
 *   https://yorecebimde-staging.gkteches.com → `.yorecebimde-staging.gkteches.com`
 *   http://localhost:3000 → undefined (host-only cookie)
 */
function computeCookieDomain(baseURL: string): string | undefined {
  try {
    const host = new URL(baseURL).hostname;
    if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return undefined;
    return `.${host}`;
  } catch {
    return undefined;
  }
}
