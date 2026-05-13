import { StoreSettingsForm } from '@/components/seller/store-settings-form';

export default function StoreSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Mağaza Ayarları</h1>
        <p className="text-sm text-ink-muted80">Mağaza vitrin bilgilerinizi düzenleyin.</p>
      </div>
      <StoreSettingsForm />
    </div>
  );
}

export const metadata = { title: 'Mağaza Ayarları', robots: { index: false } };
