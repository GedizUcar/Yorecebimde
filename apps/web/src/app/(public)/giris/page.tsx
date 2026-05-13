'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    setError(null);
    setSubmitting(true);
    try {
      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });
      if (result.error) {
        setError(result.error.message ?? 'Giriş başarısız');
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Beklenmedik bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="tile-light">
      <div className="max-w-md mx-auto space-y-8">
        <h1 className="text-center">{t('loginTitle')}</h1>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...form.register('email')}
              className="w-full px-4 py-3 rounded-pill border border-hairline focus:border-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus/30"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              {t('password')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register('password')}
              className="w-full px-4 py-3 rounded-pill border border-hairline focus:border-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus/30"
            />
            {form.formState.errors.password && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.password.message}</p>
            )}
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
            {submitting ? '...' : t('submit')}
          </button>
        </form>

        <p className="text-center text-sm text-ink-muted80">
          {t('noAccount')}{' '}
          <Link href="/kayit" className="text-primary underline">
            {tCommon('register')}
          </Link>
        </p>
      </div>
    </main>
  );
}
