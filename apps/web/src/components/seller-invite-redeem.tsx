'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';
import { useToast } from '@/components/toast';

export function SellerInviteRedeem({ token }: { token: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [validation, setValidation] = useState<{ email: string; name: string; sellerId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient
      .post<{ email: string; name: string; sellerId: string }>('/v1/sellers/invites/redeem', { token })
      .then(setValidation)
      .catch((e) => setError(e instanceof ClientApiError ? e.message : 'Davet doğrulanamadı'));
  }, [token]);

  async function complete() {
    if (!validation) return;
    if (password.length < 10) {
      show('Şifre en az 10 karakter olmalı', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const signupResult = await authClient.signUp.email({
        email: validation.email,
        password,
        name: validation.name,
      });
      if (signupResult.error) throw new Error(signupResult.error.message ?? 'Signup failed');

      // Complete redeem — link seller to new user
      await apiClient.post('/v1/sellers/invites/complete', { token });

      show('Hesabınız oluşturuldu', 'success');
      router.push('/seller/onboarding');
    } catch (e) {
      show(e instanceof Error ? e.message : 'Hesap oluşturulamadı', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-6">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!validation) {
    return <p className="text-sm text-ink-muted80">Doğrulanıyor…</p>;
  }

  return (
    <div className="rounded-lg bg-canvas border border-hairline p-8 space-y-6">
      <div>
        <p className="text-sm text-ink-muted80">Davet edildiğiniz email:</p>
        <p className="font-medium">{validation.email}</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Şifre (en az 10 karakter)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-hairline rounded-md"
          minLength={10}
        />
      </div>
      <button
        type="button"
        onClick={complete}
        disabled={submitting || password.length < 10}
        className="btn-primary w-full disabled:opacity-60"
      >
        {submitting ? 'Oluşturuluyor…' : 'Hesabımı Oluştur ve Panele Git'}
      </button>
    </div>
  );
}
