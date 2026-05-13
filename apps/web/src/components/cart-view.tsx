'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart, updateCartItem, removeCartItem } from '@/lib/cart-store';
import { formatCents, isEmpty } from '@/lib/cart-types';
import { useToast } from '@/components/toast';
import { ClientApiError } from '@/lib/api-client';
import { CouponInput } from '@/components/coupons/coupon-input';
import { PlaceholderImage } from '@/components/placeholder-image';

export function CartView() {
  const { cart, loading } = useCart();
  const { show } = useToast();
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [couponDiscountCents, setCouponDiscountCents] = useState(0);

  if (loading || !cart) {
    return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;
  }

  if (isEmpty(cart) || cart.items.length === 0) {
    return (
      <div className="rounded-lg bg-canvas-parchment p-12 text-center space-y-3">
        <p className="text-ink-muted80">Sepetiniz boş.</p>
        <Link href="/" className="inline-block text-primary hover:underline text-sm">
          Alışverişe başla →
        </Link>
      </div>
    );
  }

  async function handleQtyChange(itemId: string, qty: number) {
    setBusyItemId(itemId);
    try {
      await updateCartItem(itemId, qty);
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Güncellenemedi', 'error');
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleRemove(itemId: string) {
    setBusyItemId(itemId);
    try {
      await removeCartItem(itemId);
      show('Üründen kaldırıldı', 'info');
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Silinemedi', 'error');
    } finally {
      setBusyItemId(null);
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-3">
        {cart.warnings.length > 0 && (
          <ul className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 space-y-1">
            {cart.warnings.map((w, i) => (
              <li key={i}>⚠ {w}</li>
            ))}
          </ul>
        )}
        <ul className="divide-y divide-hairline rounded-lg border border-hairline bg-canvas">
          {cart.items.map((item) => {
            const summary = cart.totals.lineSummaries.find((l) => l.itemId === item.id);
            const lineTotal = summary?.lineTotalCents ?? 0;
            const thumb =
              item.product.primaryImage?.thumbnailUrl ??
              item.product.primaryImage?.webpUrl ??
              item.product.primaryImage?.url;
            return (
              <li key={item.id} className="flex items-center gap-4 p-4">
                <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt={item.product.nameTr} className="w-full h-full object-cover" />
                  ) : (
                    <PlaceholderImage
                      seed={item.product.nameTr}
                      category={item.product.nameTr}
                      size="sm"
                      className="w-full h-full"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/urun/${item.product.seller.slug}/${item.product.slug}`}
                    className="font-medium hover:text-primary line-clamp-1"
                  >
                    {item.product.nameTr}
                  </Link>
                  <p className="text-xs text-ink-muted80">{item.product.seller.displayName}</p>
                  {item.variation && (
                    <p className="text-xs text-ink-muted80">{item.variation.label}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-hairline rounded-pill overflow-hidden">
                    <button
                      type="button"
                      disabled={busyItemId === item.id}
                      onClick={() => handleQtyChange(item.id, Math.max(0, Number(item.quantity) - 1))}
                      className="w-7 h-7 hover:bg-canvas-parchment disabled:opacity-50"
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-sm font-medium">
                      {Number(item.quantity)}
                    </span>
                    <button
                      type="button"
                      disabled={busyItemId === item.id}
                      onClick={() => handleQtyChange(item.id, Number(item.quantity) + 1)}
                      className="w-7 h-7 hover:bg-canvas-parchment disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-ink-muted80">/ {item.product.unit}</span>
                </div>
                <div className="text-right w-28">
                  <p className="font-semibold">{formatCents(lineTotal)}</p>
                  <button
                    type="button"
                    disabled={busyItemId === item.id}
                    onClick={() => handleRemove(item.id)}
                    className="text-xs text-red-700 hover:underline mt-1 disabled:opacity-50"
                  >
                    Kaldır
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="md:col-span-1">
        <div className="sticky top-20 rounded-lg border border-hairline bg-canvas p-5 space-y-3">
          <h2 className="font-semibold">Sipariş Özeti</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted80">Ara toplam</dt>
              <dd>{formatCents(cart.totals.subtotalCents)}</dd>
            </div>
            {cart.totals.discountCents > 0 && (
              <div className="flex justify-between text-primary">
                <dt>İndirim</dt>
                <dd>−{formatCents(cart.totals.discountCents)}</dd>
              </div>
            )}
            {cart.totals.kdvCents > 0 && (
              <div className="flex justify-between text-ink-muted80">
                <dt>KDV (dahil)</dt>
                <dd>{formatCents(cart.totals.kdvCents)}</dd>
              </div>
            )}
            <div className="flex justify-between text-ink-muted80">
              <dt>Kargo</dt>
              <dd>Ödeme adımında hesaplanır</dd>
            </div>
            {couponDiscountCents > 0 && (
              <div className="flex justify-between text-green-700">
                <dt>Kupon indirimi</dt>
                <dd>−{formatCents(couponDiscountCents)}</dd>
              </div>
            )}
            <div className="border-t border-hairline pt-2 flex justify-between text-lg font-bold">
              <dt>Toplam</dt>
              <dd>{formatCents(Math.max(0, cart.totals.totalCents - couponDiscountCents))}</dd>
            </div>
          </dl>
          <div className="pt-3 border-t border-hairline">
            <CouponInput
              cartSubtotalCents={cart.totals.subtotalCents}
              onApply={(res) => setCouponDiscountCents(res?.discountCents ?? 0)}
            />
          </div>
          <Link
            href="/odeme"
            className="btn-primary w-full text-center"
          >
            Ödemeye Devam Et →
          </Link>
        </div>
      </div>
    </div>
  );
}
