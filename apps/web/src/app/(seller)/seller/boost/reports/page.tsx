import { BoostReports } from '@/components/seller/boost-reports';

export default function BoostReportsPage() {
  return (
    <div className="space-y-6">
      <h1>Boost Performans Raporu</h1>
      <BoostReports />
    </div>
  );
}

export const metadata = { title: 'Boost Raporları', robots: { index: false } };
