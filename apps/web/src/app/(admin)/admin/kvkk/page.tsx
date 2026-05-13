import { AdminKvkkList } from '@/components/admin/admin-kvkk-list';

export default function AdminKvkkPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>KVKK Talepleri</h1>
        <p className="text-sm text-ink-muted80">
          Kişisel Verilerin Korunması Kanunu kapsamındaki talepler. 30g cevap zorunluluğu.
        </p>
      </div>
      <AdminKvkkList />
    </div>
  );
}

export const metadata = { title: 'Admin · KVKK', robots: { index: false } };
