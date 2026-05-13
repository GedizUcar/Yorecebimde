import { AdminSettings } from '@/components/admin/admin-settings';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Sistem Ayarları</h1>
        <p className="text-sm text-ink-muted80">
          DB-backed config. Hassas alanlar (API keys, secret'lar) UI'da maskelenir.
        </p>
      </div>
      <AdminSettings />
    </div>
  );
}

export const metadata = { title: 'Admin · Ayarlar', robots: { index: false } };
