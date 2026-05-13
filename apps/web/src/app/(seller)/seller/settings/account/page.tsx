import { AccountSettingsForm } from '@/components/seller/account-settings-form';

export default function AccountSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Hesap Ayarları</h1>
        <p className="text-sm text-ink-muted80">
          Profil bilgileriniz, şifre ve bildirim tercihleri.
        </p>
      </div>
      <AccountSettingsForm />
    </div>
  );
}

export const metadata = { title: 'Hesap Ayarları', robots: { index: false } };
