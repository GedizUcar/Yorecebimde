import { AdminApplicationsList } from '@/components/admin/admin-applications-list';

export default function AdminApplicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Satıcı Başvuruları</h1>
        <p className="text-sm text-ink-muted80">Bekleyen / onaylanmış / reddedilmiş başvurular</p>
      </div>
      <AdminApplicationsList />
    </div>
  );
}

export const metadata = { title: 'Admin · Başvurular', robots: { index: false } };
