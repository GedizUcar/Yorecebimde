import { AdminDisputesList } from '@/components/admin/admin-disputes-list';

export default function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1>İade Talepleri</h1>
        <p className="text-sm text-ink-muted80">
          Eskalasyon ve karar gereken iadeler. 7g cevapsız → otomatik eskale.
        </p>
      </div>
      <AdminDisputesList searchParams={searchParams} />
    </div>
  );
}

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin · İadeler', robots: { index: false } };
