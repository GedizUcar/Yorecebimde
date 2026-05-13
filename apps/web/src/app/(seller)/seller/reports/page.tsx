import { SellerReports } from '@/components/seller/seller-reports';

export default function SellerReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Raporlar</h1>
        <p className="text-sm text-ink-muted80">Satış özetleri, KPI'lar ve CSV export.</p>
      </div>
      <SellerReports />
    </div>
  );
}

export const metadata = { title: 'Raporlar', robots: { index: false } };
