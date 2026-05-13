import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiServer, ApiClientError } from '@/lib/api';
import { SellerOrderActions } from '@/components/seller/seller-order-actions';

type Item = {
  id: string;
  productNameSnapshot: string;
  variationLabelSnapshot: string | null;
  unitSnapshot: string;
  quantity: string;
  unitPriceCents: number;
  lineTotalCents: number;
};

type Detail = {
  order: {
    id: string;
    orderNo: string;
    status: string;
    subtotalCents: number;
    discountCents: number;
    shippingCents: number;
    kdvCents: number;
    totalCents: number;
    commissionCents: number;
    sellerPayoutCents: number;
    cargoMode: string;
    trackingNo: string | null;
    note: string | null;
    paidAt: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    shippingAddressSnapshot: {
      label: string;
      recipientName: string;
      phone: string;
      province: string;
      district: string;
      addressLine: string;
    };
    createdAt: string;
  };
  items: Item[];
};

const STATUS_LABELS: Record<string, string> = {
  paid: 'Yeni · onayınızı bekliyor',
  confirmed: 'Onaylandı',
  preparing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim edildi',
  completed: 'Tamamlandı',
  cancelled: 'İptal edildi',
};

function formatCents(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n / 100);
}

export default async function SellerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let data: Detail;
  try {
    data = await apiServer.get<Detail>(`/v1/seller/orders/${id}`);
  } catch (e) {
    if (e instanceof ApiClientError && e.status === 404) notFound();
    throw e;
  }
  const { order, items } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/seller/orders" className="text-sm text-primary hover:underline">
          ← Siparişler
        </Link>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1>{order.orderNo}</h1>
          <p className="text-sm text-ink-muted80">
            {new Date(order.createdAt).toLocaleString('tr-TR')}
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-pill bg-canvas-parchment text-sm font-medium">
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <section className="rounded-lg bg-canvas border border-hairline overflow-hidden">
            <h2 className="px-6 py-4 border-b border-hairline font-semibold">Ürünler</h2>
            <ul className="divide-y divide-hairline">
              {items.map((it) => (
                <li key={it.id} className="flex justify-between gap-4 p-4">
                  <div className="flex-1">
                    <p className="font-medium">{it.productNameSnapshot}</p>
                    {it.variationLabelSnapshot && (
                      <p className="text-xs text-ink-muted80">{it.variationLabelSnapshot}</p>
                    )}
                    <p className="text-xs text-ink-muted80">
                      {Number(it.quantity)} {it.unitSnapshot} × {formatCents(it.unitPriceCents)}
                    </p>
                  </div>
                  <p className="font-semibold">{formatCents(it.lineTotalCents)}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg bg-canvas border border-hairline p-6">
            <h2 className="font-semibold mb-2">Teslimat Adresi</h2>
            <p className="text-sm font-medium">{order.shippingAddressSnapshot.recipientName}</p>
            <p className="text-sm text-ink-muted80">{order.shippingAddressSnapshot.phone}</p>
            <p className="text-sm text-ink-muted80 mt-1">
              {order.shippingAddressSnapshot.district}, {order.shippingAddressSnapshot.province}
            </p>
            <p className="text-sm text-ink-muted80">
              {order.shippingAddressSnapshot.addressLine}
            </p>
          </section>

          {order.trackingNo && (
            <section className="rounded-lg bg-canvas border border-hairline p-6">
              <h2 className="font-semibold mb-2">Kargo</h2>
              <p className="text-sm">
                <span className="text-ink-muted80">Takip No:</span>{' '}
                <span className="font-mono">{order.trackingNo}</span>
              </p>
              <p className="text-xs text-ink-muted80">Kargo şirketi: {order.cargoMode}</p>
            </section>
          )}

          {order.note && (
            <section className="rounded-lg bg-canvas-parchment border border-hairline p-6">
              <h2 className="font-semibold mb-2">Müşteri notu</h2>
              <p className="text-sm whitespace-pre-line">{order.note}</p>
            </section>
          )}
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg bg-canvas border border-hairline p-5">
            <h2 className="font-semibold mb-3">Özet</h2>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted80">Ara toplam</dt>
                <dd>{formatCents(order.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between text-ink-muted80">
                <dt>İndirim</dt>
                <dd>−{formatCents(order.discountCents)}</dd>
              </div>
              <div className="flex justify-between text-ink-muted80">
                <dt>Kargo</dt>
                <dd>{order.shippingCents > 0 ? formatCents(order.shippingCents) : 'Ücretsiz'}</dd>
              </div>
              <div className="border-t border-hairline pt-2 flex justify-between text-base font-bold">
                <dt>Toplam</dt>
                <dd>{formatCents(order.totalCents)}</dd>
              </div>
            </dl>
          </div>

          <SellerOrderActions orderId={order.id} status={order.status} />
        </aside>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
