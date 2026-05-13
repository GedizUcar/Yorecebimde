/**
 * Better-Auth config factory.
 *
 * Bu paket framework-agnostic config'i exposes eder.
 * NestJS API tarafında, web BFF tarafında ve testlerde aynı config inject edilir.
 *
 * Better-Auth API'si projemizdeki Drizzle şemasına bağlanır (`drizzleAdapter`).
 */
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import type { Database } from '@yorecebimde/db';
import * as schema from '@yorecebimde/db/schema';

export type CreateAuthOptions = {
  db: Database;
  secret: string;
  baseURL: string;
  sessionMaxAgeDays?: number;
  cookieName?: string;
  trustedOrigins?: string[];
  /**
   * Cookie domain — staging/prod'da `api.*` ve web subdomain'i arasında cookie paylaşımı için.
   * Örn: `.yorecebimde-staging.gkteches.com` → her iki subdomain'e set edilir.
   * Lokal dev'de tanımsız bırak (host-only cookie).
   */
  cookieDomain?: string;
  /** SMS OTP sender — uygulama tarafından `notifications` paketinden inject edilir. */
  sendOtpSms?: (phone: string, code: string) => Promise<void>;
  /** Email sender (verification, reset password) */
  sendEmail?: (to: string, subject: string, html: string) => Promise<void>;
};

export function createAuth(opts: CreateAuthOptions) {
  const sessionDays = opts.sessionMaxAgeDays ?? 30;
  void opts.cookieName;

  const db = opts.db;

  const config = {
    appName: 'Yörecebimde',
    secret: opts.secret,
    baseURL: opts.baseURL,
    trustedOrigins: opts.trustedOrigins ?? [],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.authUser,
        session: schema.authSession,
        account: schema.authAccount,
        verification: schema.authVerification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * sessionDays,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    advanced: {
      cookiePrefix: 'yorecebimde',
      defaultCookieAttributes: {
        secure: true,
        sameSite: 'lax' as const,
        httpOnly: true,
        ...(opts.cookieDomain ? { domain: opts.cookieDomain } : {}),
      },
      ...(opts.cookieDomain ? { crossSubDomainCookies: { enabled: true, domain: opts.cookieDomain } } : {}),
      database: { generateId: false },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
    },
    /**
     * Database hook'ları — Better-Auth user CRUD'una bağlanır.
     * onSignUp: auth_user oluşunca bizim `users` tablomuza row insert et.
     */
    databaseHooks: {
      user: {
        create: {
          after: async (user: { id: string; email: string; name?: string | null }) => {
            // Bu user'ın bizim users tablomuzda kaydı var mı kontrol et (idempotent)
            const existing = await db
              .select({ id: schema.users.id })
              .from(schema.users)
              .where(eq(schema.users.authUserId, user.id))
              .limit(1);

            if (existing.length > 0) return;

            // Name'i first/last split et (Better-Auth full name verir)
            const parts = (user.name ?? '').trim().split(/\s+/);
            const firstName = parts[0] ?? null;
            const lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;

            await db.insert(schema.users).values({
              authUserId: user.id,
              email: user.email,
              firstName,
              lastName,
              role: 'customer',
              status: 'active',
              preferredLocale: 'tr',
              kvkkAcceptedAt: new Date(),
            });
          },
        },
      },
    },
    plugins: [
      twoFactor({
        issuer: 'Yörecebimde',
        // TOTP — 6 haneli, 30 saniye window
        totpOptions: {
          digits: 6,
          period: 30,
        },
        // 8 backup kodu üretilir, her biri tek kullanımlık
        backupCodeOptions: {
          amount: 8,
          length: 10,
        },
      }),
    ],
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof createAuth>;
