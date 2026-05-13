import { logger } from '@yorecebimde/shared';

/**
 * Sentry SDK lazy-init. Faz 7 — paket henüz install edilmedi; runtime'da
 * `@sentry/node` import edilebiliyorsa kuruluyor, değilse no-op.
 *
 * Production'a almak için:
 *   pnpm add @sentry/node @sentry/profiling-node -F @yorecebimde/api
 *   SENTRY_DSN env'i set et
 */
export async function initSentry(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info('sentry skipped — SENTRY_DSN not set');
    return;
  }

  try {
    // Dynamic import — paket yoksa try/catch ile yutulur
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Sentry: any = await (Function('return import("@sentry/node")')() as Promise<unknown>).catch(() => null);
    if (!Sentry) {
      logger.warn('sentry skipped — @sentry/node not installed');
      return;
    }

    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
      release: process.env.GIT_SHA,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.05),
      profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? 0.0),
      ignoreErrors: [
        /BusinessRuleError/,
        /ValidationError/,
        /AuthRequiredError/,
        /NotFoundError/,
      ],
      beforeSend(event: unknown) {
        // PII scrubbing — request body'de IBAN/TC olabilir
        // Faz 8'de granüler scrubber config
        return event;
      },
    });

    logger.info({ env: process.env.SENTRY_ENVIRONMENT }, 'sentry initialized');
  } catch (err) {
    logger.warn({ err: String(err) }, 'sentry init failed');
  }
}

export async function captureException(err: unknown, context?: Record<string, unknown>): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Sentry: any = await (Function('return import("@sentry/node")')() as Promise<unknown>).catch(() => null);
    if (!Sentry) return;
    Sentry.captureException(err, context ? { extra: context } : undefined);
  } catch {
    // sentry yoksa sessiz
  }
}
