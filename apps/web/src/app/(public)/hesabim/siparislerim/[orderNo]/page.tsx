import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiServer, ApiClientError } from '@/lib/api';
import { OrderActions } from '@/components/order-actions';

type OrderItem = {
  id: string;
  productNameSnapshot: string;
  variationLabelSnapshot: string | null;
  unitSnapshot: string;
  quantity: string;
  unitPriceCents: number;
  lineTotalCents: number;
};

type OrderDetail = {
  order: {
    id: string;
    orderNo: string;
    status: string;
    subtotalCents: number;
    discountCents: number;
    shippingCents: number;
    kdvCents: number;
    totalCents: number;
    cargoMode: string;
    trackingNo: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    cancelReason: string | null;
    note: string | null;
    paidAt: string | null;
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
  items: OrderItem[];
};

const STATUS_LABELS: Record<string, string> = {
  created: 'Oluşturuldu',
  pending_payment: 'Ödeme bekleniyor',
  paid: 'Ödendi',
  confirmed: 'Satıcı onayladı',
  preparing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim edildi',
  completed: 'Tamamlandı',
  cancelled: 'İptal edildi',
};

function formatCents(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n / 100);
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;

  let data: OrderDetail;
  try {
    data = await apiServer.get<OrderDetail>(`/v1/orders/${orderNo}`);
  } catch (e) {
    if (e instanceof ApiClientError && e.status === 404) notFound();
    if (e instanceof ApiClientError && e.status === 401) {
      return (
        <main className="tile-light">
          <div className="max-w-content mx-auto rounded-lg bg-canvas-parchment p-12 text-center">
            <p className="text-ink-muted80">Giriş yapmanız gerekiyor.</p>
          </div>
        </main>
      );
    }
    throw e;
  }

  const { order, items } = data;

  return (
    <main className="tile-light">
      <div className="max-w-content mx-auto space-y-6">
        <nav className="text-sm text-ink-muted80">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-primary">
                Anasayfa
              </Link>
            </li>
            <li>›</li>
            <li>
              <Link href="/hesabim/siparislerim" className="hover:text-primary">
                Siparişlerim
              </Link>
            </li>
            <li>›</li>
            <li className="text-ink font-medium">{order.orderNo}</li>
          </ol>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1>{order.orderNo}</h1>
            <p className="text-sm text-ink-muted80">
              {new Date(order.createdAt).toLocaleString('tr-TR')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/hesabim/siparislerim/${order.orderNo}/sozlesme`}
              className="px-3 py-1.5 rounded-pill border border-hairline text-xs hover:bg-canvas-parchment"
              title="Mesafeli Satış Sözleşmesi — yazdırılabilir HTML"
            >
              📄 Sözleşme
            </a>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL ?? ''}/v1/orders/${order.orderNo}/sozlesme.pdf`}
              target="_blank"
              rel="noopener"
              className="px-3 py-1.5 rounded-pill border border-hairline text-xs hover:bg-canvas-parchment"
              title="Mesafeli Satış Sözleşmesi — PDF indir"
            >
              ⬇ PDF
            </a>
            <span className="px-3 py-1.5 rounded-pill bg-canvas-parchment text-sm font-medium">
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {/* Items */}
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

            {/* Address */}
            <section className="rounded-lg bg-canvas border border-hairline p-6">
              <h2 className="font-semibold mb-2">Teslimat Adresi</h2>
              <p className="text-sm">{order.shippingAddressSnapshot.recipientName}</p>
              <p className="text-sm text-ink-muted80">{order.shippingAddressSnapshot.phone}</p>
              <p className="text-sm text-ink-muted80 mt-1">
                {order.shippingAddressSnapshot.district}, {order.shippingAddressSnapshot.province}
              </p>
              <p className="text-sm text-ink-muted80">
                {order.shippingAddressSnapshot.addressLine}
              </p>
            </section>

            {/* Cargo */}
            {order.trackingNo && (
              <section className="rounded-lg bg-canvas border border-hairline p-6">
                <h2 className="font-semibold mb-2">Kargo</h2>
                <p className="text-sm">
                  Takip No: <span className="font-mono">{order.trackingNo}</span>
                </p>
                <p className="text-xs text-ink-muted80 mt-1">Kargo: {order.cargoMode}</p>
                {order.shippedAt && (
                  <p className="text-xs text-ink-muted80">
                    Gönderildi: {new Date(order.shippedAt).toLocaleString('tr-TR')}
                  </p>
                )}
                {order.deliveredAt && (
                  <p className="text-xs text-ink-muted80">
                    Teslim edildi: {new Date(order.deliveredAt).toLocaleString('tr-TR')}
                  </p>
                )}
              </section>
            )}

            {order.note && (
              <section className="rounded-lg bg-canvas border border-hairline p-6">
                <h2 className="font-semibold mb-2">Not</h2>
                <p className="text-sm text-ink-muted80 whitespace-pre-line">{order.note}</p>
              </section>
            )}

            {order.cancelReason && (
              <section className="rounded-lg bg-red-50 border border-red-200 p-6">
                <h2 className="font-semibold mb-2 text-red-800">İptal Sebebi</h2>
                <p className="text-sm text-red-700">{order.cancelReason}</p>
              </section>
            )}
          </div>

          {/* Summary */}
          <aside className="rounded-lg bg-canvas border border-hairline p-5 h-fit sticky top-20 space-y-3">
            <h2 className="font-semibold">Özet</h2>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted80">Ara toplam</dt>
                <dd>{formatCents(order.subtotalCents)}</dd>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between text-primary">
                  <dt>İndirim</dt>
                  <dd>−{formatCents(order.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between text-ink-muted80">
                <dt>Kargo</dt>
                <dd>{order.shippingCents > 0 ? formatCents(order.shippingCents) : 'Ücretsiz'}</dd>
              </div>
              {order.kdvCents > 0 && (
                <div className="flex justify-between text-ink-muted80">
                  <dt>KDV</dt>
                  <dd>{formatCents(order.kdvCents)}</dd>
                </div>
              )}
              <div className="border-t border-hairline pt-2 flex justify-between text-lg font-bold">
                <dt>Toplam</dt>
                <dd>{formatCents(order.totalCents)}</dd>
              </div>
            </dl>
            <OrderActions orderId={order.id} status={order.status} />
          </aside>
        </div>
      </div>
    </main>
  );
}

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sipariş Detay', robots: { index: false } };
