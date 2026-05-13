import Link from 'next/link';
import { apiServer, ApiClientError } from '@/lib/api';

type OrderRow = {
  id: string;
  orderNo: string;
  status: string;
  totalCents: number;
  createdAt: string;
  shippingAddressSnapshot: { recipientName: string; district: string; province: string };
};

const STATUS_LABELS: Record<string, string> = {
  paid: 'Yeni',
  confirmed: 'Onaylandı',
  preparing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim edildi',
  completed: 'Tamamlandı',
  cancelled: 'İptal edildi',
};

const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: '', label: 'Hepsi' },
  { id: 'paid', label: 'Yeni' },
  { id: 'confirmed', label: 'Onaylandı' },
  { id: 'preparing', label: 'Hazırlanıyor' },
  { id: 'shipped', label: 'Kargoda' },
  { id: 'delivered', label: 'Teslim edildi' },
  { id: 'completed', label: 'Tamamlandı' },
  { id: 'cancelled', label: 'İptal' },
];

function formatCents(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n / 100);
}

export default async function SellerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  let orders: OrderRow[] = [];
  let unauthorized = false;
  try {
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    qs.set('limit', '50');
    orders = await apiServer.get<OrderRow[]>(`/v1/seller/orders?${qs}`);
  } catch (e) {
    if (e instanceof ApiClientError && e.status === 401) unauthorized = true;
    else if (e instanceof ApiClientError && e.status === 403) unauthorized = true;
    else throw e;
  }

  if (unauthorized) {
    return (
      <div className="rounded-lg bg-canvas p-12 text-center border border-hairline">
        <p className="text-ink-muted80 mb-4">Satıcı hesabıyla giriş yapın.</p>
        <Link href="/giris" className="text-primary hover:underline">
          Giriş Yap →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>Siparişler</h1>
        <p className="text-sm text-ink-muted80">Gelen siparişleri buradan yönetin</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = (status ?? '') === f.id;
          return (
            <Link
              key={f.id}
              href={(f.id ? `/seller/orders?status=${f.id}` : '/seller/orders')}
              className={`px-4 py-1.5 rounded-pill text-sm transition-colors ${
                active
                  ? 'bg-primary text-white'
                  : 'bg-canvas border border-hairline hover:border-primary'
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg bg-canvas-parchment p-12 text-center">
          <p className="text-ink-muted80">Bu filtrede sipariş yok.</p>
        </div>
      ) : (
        <div className="rounded-lg bg-canvas border border-hairline overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-canvas-parchment">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Sipariş No</th>
                <th className="px-4 py-3 text-left font-medium">Müşteri</th>
                <th className="px-4 py-3 text-left font-medium">Tutar</th>
                <th className="px-4 py-3 text-left font-medium">Durum</th>
                <th className="px-4 py-3 text-left font-medium">Tarih</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-hairline">
                  <td className="px-4 py-3 font-mono text-xs">{o.orderNo}</td>
                  <td className="px-4 py-3">
                    <p>{o.shippingAddressSnapshot?.recipientName}</p>
                    <p className="text-xs text-ink-muted80">
                      {o.shippingAddressSnapshot?.district}, {o.shippingAddressSnapshot?.province}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatCents(o.totalCents)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-pill bg-canvas-parchment text-xs">
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted80">
                    {new Date(o.createdAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/seller/orders/${o.id}`}
                      className="text-primary hover:underline text-sm"
                    >
                      Detay
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';
