'use client';

import Link from 'next/link';

type Dashboard = {
  gmv: { today: number; week: number; month: number; total: number };
  counts: {
    ordersToday: number;
    ordersWeek: number;
    ordersMonth: number;
    activeSellers: number;
    pendingApplications: number;
    openDisputes: number;
    escalatedDisputes: number;
  };
};

function formatCents(n: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n / 100);
}

export function AdminDashboardClient({ data }: { data: Dashboard | null }) {
  if (!data) {
    return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;
  }
  return (
    <div className="space-y-6">
      <div>
        <h1>Genel Bakış</h1>
        <p className="text-sm text-ink-muted80">Platform operasyon özeti</p>
      </div>

      {/* GMV kartları */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Bugün GMV" value={formatCents(data.gmv.today)} subtitle={`${data.counts.ordersToday} sipariş`} />
        <KpiCard label="Son 7 gün" value={formatCents(data.gmv.week)} subtitle={`${data.counts.ordersWeek} sipariş`} />
        <KpiCard label="Son 30 gün" value={formatCents(data.gmv.month)} subtitle={`${data.counts.ordersMonth} sipariş`} />
        <KpiCard label="Toplam GMV" value={formatCents(data.gmv.total)} subtitle="cumulative" />
      </section>

      {/* Operasyon */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tile
          href="/admin/sellers"
          label="Aktif Satıcı"
          value={String(data.counts.activeSellers)}
        />
        <Tile
          href="/admin/applications"
          label="Bekleyen Başvuru"
          value={String(data.counts.pendingApplications)}
          accent={data.counts.pendingApplications > 0 ? 'primary' : undefined}
        />
        <Tile
          href="/admin/disputes?status=opened"
          label="Açık İade"
          value={String(data.counts.openDisputes)}
        />
        <Tile
          href="/admin/disputes?status=escalated"
          label="Eskale Edilmiş"
          value={String(data.counts.escalatedDisputes)}
          accent={data.counts.escalatedDisputes > 0 ? 'urgent' : undefined}
        />
      </section>

      <section className="rounded-lg bg-canvas-parchment border border-hairline p-6">
        <h2 className="font-semibold text-ink-muted80">Faz 5.2 — Sonraki polish</h2>
        <ul className="mt-2 text-sm text-ink-muted80 space-y-1 list-disc list-inside">
          <li>Kuponlar (Faz 6 ile birlikte)</li>
          <li>Kategori talep yönetimi</li>
          <li>KVKK talep işleme</li>
          <li>Bildirim şablon editörü</li>
          <li>Sistem ayarları (system_settings tablosu)</li>
          <li>Müşteri destek chat</li>
          <li>Finansal recon (gerçek Iyzico balance match)</li>
          <li>Admin ekip yönetimi</li>
        </ul>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-lg bg-canvas border border-hairline p-4">
      <p className="text-xs text-ink-muted80 uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-xs text-ink-muted80 mt-1">{subtitle}</p>}
    </div>
  );
}

function Tile({
  href,
  label,
  value,
  accent,
}: {
  href: string;
  label: string;
  value: string;
  accent?: 'primary' | 'urgent' | undefined;
}) {
  const colors =
    accent === 'urgent'
      ? 'border-red-300 bg-red-50 hover:border-red-500'
      : accent === 'primary'
        ? 'border-primary/30 bg-primary/5 hover:border-primary'
        : 'border-hairline bg-canvas hover:border-primary';
  return (
    <Link
      href={href}
      className={`rounded-lg p-4 border transition-colors ${colors}`}
    >
      <p className="text-xs text-ink-muted80 uppercase tracking-wide">{label}</p>
      <p
        className={`mt-2 text-2xl font-bold ${
          accent === 'urgent' ? 'text-red-700' : accent === 'primary' ? 'text-primary' : ''
        }`}
      >
        {value}
      </p>
    </Link>
  );
}
