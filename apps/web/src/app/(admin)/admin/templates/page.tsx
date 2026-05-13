import { AdminTemplates } from '@/components/admin/admin-templates';

export default function AdminTemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Bildirim Şablonları</h1>
        <p className="text-sm text-ink-muted80">
          DB-backed template'ler. Aktif yoksa hardcoded fallback kullanılır. <code>{`{{var}}`}</code>{' '}
          interpolation.
        </p>
      </div>
      <AdminTemplates />
    </div>
  );
}

export const metadata = { title: 'Admin · Şablonlar', robots: { index: false } };
