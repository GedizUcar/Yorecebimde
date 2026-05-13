import { AdminCategoriesList } from '@/components/admin/admin-categories-list';

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Kategoriler</h1>
        <p className="text-sm text-ink-muted80">
          Hiyerarşik kategori ağacı. Drag-drop reorder Faz 5.2'de gelecek.
        </p>
      </div>
      <AdminCategoriesList />
    </div>
  );
}

export const metadata = { title: 'Admin · Kategoriler', robots: { index: false } };
