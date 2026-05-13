import { AdminReviewsList } from '@/components/admin/admin-reviews-list';

export default function AdminReviewsPage() {
  return (
    <div className="space-y-6">
      <h1>Yorum Moderasyonu</h1>
      <p className="text-sm text-ink-muted80">
        Müşteri yorumlarını incele, uygun olmayanları gizle (sebep zorunlu) veya gizlenenleri geri aç.
      </p>
      <AdminReviewsList />
    </div>
  );
}

export const metadata = { title: 'Yorumlar', robots: { index: false } };
