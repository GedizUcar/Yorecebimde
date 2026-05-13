import { EtbisReport } from '@/components/admin/etbis-report';

export default function AdminEtbisPage() {
  return (
    <div className="space-y-6">
      <h1>ETBİS Aylık Raporlar</h1>
      <p className="text-sm text-ink-muted80">
        Son 12 ayın özet raporu — Sanayi Bakanlığı ETBİS bildirimi için manuel form
        doldurma rehberi. CSV indirip arşivle.
      </p>
      <EtbisReport />
    </div>
  );
}

export const metadata = { title: 'ETBİS', robots: { index: false } };
