'use client';

import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useToast } from '@/components/toast';

type Phase = 'idle' | 'password' | 'qr' | 'verify' | 'backup' | 'done';

/**
 * Better-Auth twoFactor plugin'i ile TOTP setup akışı:
 *   1. password gir → /api/auth/two-factor/enable
 *   2. dönen TOTP URI + secret göster (QR + manuel kod)
 *   3. 6 haneli code gir → /api/auth/two-factor/verify-totp
 *   4. backup codes göster (kullanıcıya bir kez)
 */
export function TwoFaSetup() {
  const { show } = useToast();
  const [phase, setPhase] = useState<Phase>('idle');
  const [password, setPassword] = useState('');
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    void fetch(`${base}/v1/2fa/status`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => setEnabled(j?.data?.enabled ?? false))
      .catch(() => setEnabled(false));
  }, []);

  async function enableStart() {
    if (!password) return show('Şifreni gir', 'error');
    setBusy(true);
    try {
      const result = await authClient.twoFactor.enable({ password });
      if (result?.error) {
        show(result.error.message ?? 'Etkinleştirme başarısız', 'error');
        return;
      }
      const uri = result?.data?.totpURI ?? null;
      if (!uri) {
        show('TOTP URI alınamadı', 'error');
        return;
      }
      setTotpUri(uri);
      setPhase('qr');
    } catch (e) {
      show(e instanceof Error ? e.message : 'Hata', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (code.length !== 6) return show('6 haneli kodu gir', 'error');
    setBusy(true);
    try {
      const result = await authClient.twoFactor.verifyTotp({ code });
      if (result?.error) {
        show(result.error.message ?? 'Kod yanlış', 'error');
        return;
      }
      const codesRes = await authClient.twoFactor.generateBackupCodes({ password });
      const codes: string[] = codesRes?.data?.backupCodes ?? [];
      setBackupCodes(codes);
      setPhase('backup');
      show('2FA aktif edildi 🎉', 'success');
    } catch (e) {
      show(e instanceof Error ? e.message : 'Hata', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!confirm('2FA\'yı kapatmak istediğine emin misin? Hesap güvenliği zayıflar.')) return;
    if (!password) return show('Şifreni gir', 'error');
    setBusy(true);
    try {
      const result = await authClient.twoFactor.disable({ password });
      if (result?.error) {
        show(result.error.message ?? 'Kapatma başarısız', 'error');
        return;
      }
      show('2FA devre dışı', 'info');
      setEnabled(false);
      setPhase('idle');
    } catch (e) {
      show(e instanceof Error ? e.message : 'Hata', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (enabled === null) return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;

  if (enabled && phase !== 'backup' && phase !== 'done') {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-6 space-y-3">
        <p className="text-green-800 font-semibold">✓ 2FA aktif</p>
        <p className="text-sm text-green-700/80">
          Hesabınız 2 faktörlü doğrulama ile korunuyor. Backup kodlarınızı kaybettiyseniz
          yeniden üretebilirsiniz (şifre gerekli).
        </p>
        <div className="flex items-center gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifren"
            className="flex-1 px-3 py-2 border border-hairline rounded-md text-sm"
          />
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className="px-4 py-2 rounded-pill border border-red-700 text-red-700 text-sm hover:bg-red-50 disabled:opacity-60"
          >
            2FA'yı Kapat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-canvas border border-hairline p-6 space-y-4">
      {phase === 'idle' && (
        <>
          <h2 className="font-semibold">Başla</h2>
          <p className="text-sm text-ink-muted80">
            Devam etmek için şifreni doğrula. Sonra authenticator uygulaman ile QR kodu okutacaksın.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifren"
            className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
          />
          <button
            type="button"
            onClick={enableStart}
            disabled={busy || !password}
            className="px-4 py-2 rounded-pill bg-primary text-white text-sm hover:bg-primary-700 disabled:opacity-60"
          >
            {busy ? 'Hazırlanıyor…' : 'Devam Et'}
          </button>
        </>
      )}

      {phase === 'qr' && totpUri && (
        <>
          <h2 className="font-semibold">QR Kodu Tara</h2>
          <p className="text-sm text-ink-muted80">
            Authenticator uygulamanda "Hesap Ekle" → QR tara → Yörecebimde.
          </p>
          {/* QR API ile basit görsel — gerçek prod'da kendi QR lib'i (qrcode) */}
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`}
              alt="2FA QR Code"
              className="border border-hairline rounded-md"
            />
            <details className="text-xs text-ink-muted80 w-full">
              <summary className="cursor-pointer">QR taranamıyorsa manuel kod</summary>
              <code className="block mt-2 p-2 bg-canvas-parchment rounded font-mono break-all">
                {totpUri}
              </code>
            </details>
          </div>
          <button
            type="button"
            onClick={() => setPhase('verify')}
            className="w-full px-4 py-2 rounded-pill bg-primary text-white text-sm hover:bg-primary-700"
          >
            Taradım, devam et
          </button>
        </>
      )}

      {phase === 'verify' && (
        <>
          <h2 className="font-semibold">6 Haneli Kodu Gir</h2>
          <p className="text-sm text-ink-muted80">
            Authenticator uygulamanda görünen 6 haneli kodu gir.
          </p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full px-3 py-2 border border-hairline rounded-md text-center text-2xl font-mono tracking-widest"
          />
          <button
            type="button"
            onClick={verifyCode}
            disabled={busy || code.length !== 6}
            className="w-full px-4 py-2 rounded-pill bg-primary text-white text-sm hover:bg-primary-700 disabled:opacity-60"
          >
            {busy ? 'Doğrulanıyor…' : 'Doğrula'}
          </button>
        </>
      )}

      {phase === 'backup' && (
        <>
          <h2 className="font-semibold text-red-700">⚠ Backup Kodlar — Bir Kez Gösteriliyor</h2>
          <p className="text-sm text-red-700/80">
            Authenticator uygulamana erişimini kaybedersen bu kodlarla giriş yapabilirsin.
            <strong> Her biri tek kullanımlık.</strong> Güvenli bir yere kaydet (şifre yöneticisi
            önerilir).
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-canvas-parchment p-4 rounded-md">
            {backupCodes.map((c) => (
              <div key={c} className="select-all">
                {c}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(backupCodes.join('\n')).catch(() => {});
              show('Kodlar kopyalandı', 'success');
            }}
            className="px-4 py-2 rounded-pill border border-hairline text-sm hover:bg-canvas-parchment"
          >
            Kopyala
          </button>
          <button
            type="button"
            onClick={() => {
              setPhase('done');
              setEnabled(true);
            }}
            className="w-full px-4 py-2 rounded-pill bg-primary text-white text-sm hover:bg-primary-700"
          >
            Kaydettim, tamam
          </button>
        </>
      )}

      {phase === 'done' && (
        <div className="text-center space-y-2">
          <p className="text-2xl">✓</p>
          <p className="font-semibold">2FA başarıyla aktive edildi</p>
        </div>
      )}
    </div>
  );
}
