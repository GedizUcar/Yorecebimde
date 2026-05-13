import { AdminBoostPackages } from '@/components/admin/admin-boost-packages';

export default function AdminBoostPackagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Boost Paketleri</h1>
        <p className="text-sm text-ink-muted80">Satıcıların satın alabileceği boost paket fiyatları</p>
      </div>
      <AdminBoostPackages />
    </div>
  );
}

export const metadata = { title: 'Admin · Boost Paketleri', robots: { index: false } };
