'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useToast } from '@/components/toast';

export function AccountSettingsForm() {
  const { show } = useToast();
  const { data } = authClient.useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function changePassword() {
    if (newPassword.length < 10) {
      show('Yeni şifre en az 10 karakter olmalı', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      show('Şifreler eşleşmiyor', 'error');
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error(result.error.message ?? 'Şifre değiştirilemedi');
      show('Şifreniz güncellendi', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      show(e instanceof Error ? e.message : 'Şifre değiştirilemedi', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!data?.user) {
    return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;
  }

  return (
    <div className="space-y-6">
      <section className="bg-canvas border border-hairline rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold">Profil</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink-muted80">Ad Soyad</dt>
            <dd>{data.user.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted80">Email</dt>
            <dd>{data.user.email}</dd>
          </div>
        </dl>
        <p className="text-xs text-ink-muted80">
          Profil bilgilerini düzenleme Faz 4.3'te aktif olacak. Mağaza profili için "Mağaza" sekmesine bakın.
        </p>
      </section>

      <section className="bg-canvas border border-hairline rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Şifre Değiştir</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Mevcut Şifre</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Yeni Şifre (min 10 karakter)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={10}
              className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Yeni Şifre Tekrar</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={10}
              className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={changePassword}
          disabled={busy || !currentPassword || !newPassword || newPassword !== confirmPassword}
          className="btn-primary disabled:opacity-60"
        >
          {busy ? 'Güncelleniyor…' : 'Şifreyi Güncelle'}
        </button>
        <p className="text-xs text-ink-muted80">
          Şifre değişikliği tüm açık oturumlarınızı sonlandırır.
        </p>
      </section>

      <section className="bg-canvas-parchment border border-hairline rounded-lg p-6">
        <h2 className="text-lg font-semibold text-ink-muted80">Bildirim Tercihleri</h2>
        <p className="text-sm text-ink-muted80 mt-2">
          Faz 4.3'e ertelendi — yeni sipariş / düşük stok / iade kanalları (email/SMS) opt-in.
          Şu an tüm bildirimleri alıyorsunuz.
        </p>
      </section>

      <section className="bg-canvas-parchment border border-hairline rounded-lg p-6">
        <h2 className="text-lg font-semibold text-ink-muted80">2FA (İki Faktörlü Kimlik)</h2>
        <p className="text-sm text-ink-muted80 mt-2">
          Faz 4.3'e ertelendi — TOTP setup (Google Authenticator vb.) + backup kodlar.
        </p>
      </section>
    </div>
  );
}
