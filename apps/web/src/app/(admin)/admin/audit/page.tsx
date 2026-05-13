import { AdminAuditViewer } from '@/components/admin/admin-audit-viewer';

export default function AdminAuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Audit Log</h1>
        <p className="text-sm text-ink-muted80">
          Admin aksiyonlarının kaydı — read-only, append-only.
        </p>
      </div>
      <AdminAuditViewer />
    </div>
  );
}

export const metadata = { title: 'Admin · Audit Log', robots: { index: false } };
