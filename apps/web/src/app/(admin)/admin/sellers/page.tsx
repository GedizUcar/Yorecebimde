import { AdminSellersList } from '@/components/admin/admin-sellers-list';

export default function AdminSellersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Satıcılar</h1>
        <p className="text-sm text-ink-muted80">Aktif satıcıların yönetimi</p>
      </div>
      <AdminSellersList />
    </div>
  );
}

export const metadata = { title: 'Admin · Satıcılar', robots: { index: false } };
