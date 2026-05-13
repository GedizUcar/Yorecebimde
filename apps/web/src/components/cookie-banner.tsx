'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'yc.cookie_consent.v1';

type Consent = {
  necessary: true; // her zaman açık
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  updatedAt: string;
};

function loadConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Consent;
  } catch {
    return null;
  }
}

function saveConsent(consent: Consent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent('yc:consent-changed', { detail: consent }));
}

/**
 * KVKK + ePrivacy uyumlu çerez banner. İlk ziyarette gösterilir, kullanıcı
 * kategori bazlı opt-in yapar. Tercihler localStorage'da, GET değil "consent"
 * event'iyle analytics SDK'lar reaktif olarak başlatılır (Faz 8+).
 */
export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [functional, setFunctional] = useState(false);

  useEffect(() => {
    const c = loadConsent();
    if (!c) {
      setOpen(true);
    } else {
      setAnalytics(c.analytics);
      setMarketing(c.marketing);
      setFunctional(c.functional);
    }
    // Listen for re-open from elsewhere (settings page link)
    const handler = () => {
      const cur = loadConsent();
      setAnalytics(cur?.analytics ?? false);
      setMarketing(cur?.marketing ?? false);
      setFunctional(cur?.functional ?? false);
      setShowSettings(true);
      setOpen(true);
    };
    window.addEventListener('yc:cookie-settings-open', handler);
    return () => window.removeEventListener('yc:cookie-settings-open', handler);
  }, []);

  if (!open) return null;

  function persist(opts: { analytics: boolean; marketing: boolean; functional: boolean }) {
    saveConsent({
      necessary: true,
      analytics: opts.analytics,
      marketing: opts.marketing,
      functional: opts.functional,
      updatedAt: new Date().toISOString(),
    });
    setOpen(false);
    setShowSettings(false);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-canvas border-t border-hairline shadow-2xl">
      <div className="max-w-content mx-auto p-4 md:p-6 space-y-3">
        {!showSettings ? (
          <>
            <p className="text-sm">
              🍪 Yörecebimde deneyiminizi geliştirmek için çerezler kullanır. Zorunlu çerezler her
              zaman aktiftir. Analitik ve pazarlama çerezleri için onayınızı isteriz.{' '}
              <a href="/cerez-politikasi" className="text-primary hover:underline">
                Detay
              </a>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  persist({ analytics: true, marketing: true, functional: true })
                }
                className="px-4 py-2 rounded-pill bg-primary text-white text-sm hover:bg-primary-700"
              >
                Tümünü Kabul Et
              </button>
              <button
                type="button"
                onClick={() =>
                  persist({ analytics: false, marketing: false, functional: false })
                }
                className="px-4 py-2 rounded-pill border border-hairline text-sm hover:bg-canvas-parchment"
              >
                Sadece Zorunlu
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 rounded-pill border border-hairline text-sm hover:bg-canvas-parchment"
              >
                Ayarla
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold">Çerez Tercihleri</p>
            <div className="space-y-2 text-sm">
              <ToggleRow
                label="Zorunlu çerezler"
                description="Site temel işlevleri için gerekli (giriş, sepet, güvenlik). Kapatılamaz."
                checked
                disabled
                onChange={() => {}}
              />
              <ToggleRow
                label="Fonksiyonel çerezler"
                description="Tercihlerinizi (dil, son görüntülenenler) hatırlar."
                checked={functional}
                onChange={setFunctional}
              />
              <ToggleRow
                label="Analitik çerezler"
                description="Anonim trafik analizi — siteyi nasıl kullandığınız."
                checked={analytics}
                onChange={setAnalytics}
              />
              <ToggleRow
                label="Pazarlama çerezleri"
                description="Kişiselleştirilmiş reklam içerik için."
                checked={marketing}
                onChange={setMarketing}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => persist({ analytics, marketing, functional })}
                className="px-4 py-2 rounded-pill bg-primary text-white text-sm hover:bg-primary-700"
              >
                Seçimi Kaydet
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-pill border border-hairline text-sm hover:bg-canvas-parchment"
              >
                Geri
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-md border border-hairline ${
        disabled ? 'opacity-70' : 'cursor-pointer hover:bg-canvas-parchment'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1"
      />
      <div className="flex-1">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-ink-muted80 mt-0.5">{description}</p>
      </div>
    </label>
  );
}
