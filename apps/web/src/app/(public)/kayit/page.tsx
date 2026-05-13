'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';

const registerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z
    .string()
    .min(10, 'En az 10 karakter')
    .regex(/[A-Z]/, 'En az 1 büyük harf')
    .regex(/[a-z]/, 'En az 1 küçük harf')
    .regex(/[0-9]/, 'En az 1 rakam'),
  kvkkAccepted: z.literal(true, { errorMap: () => ({ message: 'KVKK onayı zorunludur' }) }),
  marketingOptIn: z.boolean().optional(),
});

type RegisterInput = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const search = useSearchParams();
  const refCode = search.get('ref')?.trim().toUpperCase() ?? null;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(data: RegisterInput) {
    setError(null);
    setSubmitting(true);
    try {
      const result = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: `${data.firstName} ${data.lastName}`,
      });
      if (result.error) {
        setError(result.error.message ?? 'Kayıt başarısız');
        return;
      }
      if (refCode) {
        try {
          await apiClient.post('/v1/referrals/redeem', { code: refCode });
        } catch {
          // referral redeem hatası kaydı engellemez
        }
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
        <h1 className="text-center">{t('registerTitle')}</h1>

        {refCode && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
            🎉 Davet kodu <strong className="font-mono">{refCode}</strong> ile kayıt
            oluyorsunuz. İlk siparişiniz sonrası <strong>25 ₺ hoşgeldin kuponu</strong> alacaksınız.
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-2">
                {t('firstName')}
              </label>
              <input
                id="firstName"
                {...form.register('firstName')}
                className="w-full px-4 py-3 rounded-pill border border-hairline focus:border-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus/30"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium mb-2">
                {t('lastName')}
              </label>
              <input
                id="lastName"
                {...form.register('lastName')}
                className="w-full px-4 py-3 rounded-pill border border-hairline focus:border-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus/30"
              />
            </div>
          </div>

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
            <label htmlFor="phone" className="block text-sm font-medium mb-2">
              {t('phone')}
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="05551234567"
              {...form.register('phone')}
              className="w-full px-4 py-3 rounded-pill border border-hairline focus:border-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus/30"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              {t('password')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
              className="w-full px-4 py-3 rounded-pill border border-hairline focus:border-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus/30"
            />
            {form.formState.errors.password && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.password.message}</p>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" {...form.register('kvkkAccepted')} className="mt-1" />
            <span>{t('kvkkAccept')}</span>
          </label>
          {form.formState.errors.kvkkAccepted && (
            <p className="text-sm text-red-600">{form.formState.errors.kvkkAccepted.message}</p>
          )}

          <label className="flex items-start gap-2 text-sm text-ink-muted80">
            <input type="checkbox" {...form.register('marketingOptIn')} className="mt-1" />
            <span>{t('marketingOptIn')}</span>
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
            {submitting ? '...' : t('submit')}
          </button>
        </form>

        <p className="text-center text-sm text-ink-muted80">
          {t('haveAccount')}{' '}
          <Link href="/giris" className="text-primary underline">
            {tCommon('login')}
          </Link>
        </p>
      </div>
    </main>
  );
}
