import { AdminTeam } from '@/components/admin/admin-team';

export default function AdminTeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Admin Ekibi</h1>
        <p className="text-sm text-ink-muted80">
          Admin kullanıcıları — role değişimi sadece super_admin tarafından.
        </p>
      </div>
      <AdminTeam />
    </div>
  );
}

export const metadata = { title: 'Admin · Ekip', robots: { index: false } };
