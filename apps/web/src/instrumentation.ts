/**
 * Next.js instrumentation hook — server + edge runtime init.
 * Sentry SDK lazy-load; paket yoksa no-op. Faz 7 — production'a almak için:
 *   pnpm add @sentry/nextjs -F @yorecebimde/web
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Sentry: any = await (Function('return import("@sentry/nextjs")')() as Promise<unknown>).catch(() => null);
      if (!Sentry) return;
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.05),
      });
    } catch {
      // ignore
    }
  }
}
