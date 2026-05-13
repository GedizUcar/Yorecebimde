import { TwoFaSetup } from '@/components/auth/two-fa-setup';

export default function TwoFaSetupPage() {
  return (
    <main className="tile-light">
      <div className="max-w-content mx-auto space-y-6">
        <h1>2 Faktörlü Doğrulama Kurulumu</h1>
        <p className="text-sm text-ink-muted80">
          Authenticator uygulamanızı (Google Authenticator, Authy, 1Password, Bitwarden vb.)
          kullanarak hesabınıza ek bir güvenlik katmanı ekleyin.
        </p>
        <TwoFaSetup />
      </div>
    </main>
  );
}

export const metadata = { title: '2FA Kurulum', robots: { index: false } };
