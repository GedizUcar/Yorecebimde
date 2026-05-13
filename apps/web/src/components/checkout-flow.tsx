'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient, ClientApiError } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';
import { useCart, emitCartUpdate } from '@/lib/cart-store';
import { formatCents, isEmpty } from '@/lib/cart-types';
import { useToast } from '@/components/toast';
import { AddressForm } from '@/components/address-form';
import { CouponInput } from '@/components/coupons/coupon-input';
import { LoyaltyRedeemSlider } from '@/components/loyalty/loyalty-redeem-slider';

type Address = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  addressLine: string;
  isDefault: boolean;
};

export function CheckoutFlow() {
  const { show } = useToast();
  const { cart, loading } = useCart();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [note, setNote] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponDiscountCents, setCouponDiscountCents] = useState(0);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loyaltyDiscountCents, setLoyaltyDiscountCents] = useState(0);

  useEffect(() => {
    if (sessionPending || !session?.user) return;
    apiClient
      .get<Address[]>('/v1/addresses')
      .then((list) => {
        setAddresses(list);
        const def = list.find((a) => a.isDefault) ?? list[0];
        if (def) setSelectedAddressId(def.id);
      })
      .catch(() => setAddresses([]));
  }, [session, sessionPending]);

  if (sessionPending || loading) {
    return <p className="text-sm text-ink-muted80">Yükleniyor…</p>;
  }

  if (!session?.user) {
    return (
      <div className="rounded-lg bg-canvas-parchment p-12 text-center space-y-3">
        <p className="text-ink-muted80">Sipariş vermek için giriş yapın.</p>
        <Link
          href={`/giris?next=${encodeURIComponent('/odeme')}`}
          className="inline-block px-6 py-2 rounded-pill bg-primary text-white font-medium hover:bg-primary-700"
        >
          Giriş Yap
        </Link>
      </div>
    );
  }

  if (!cart || isEmpty(cart) || cart.items.length === 0) {
    return (
      <div className="rounded-lg bg-canvas-parchment p-12 text-center space-y-3">
        <p className="text-ink-muted80">Sepetiniz boş.</p>
        <Link href="/" className="inline-block text-primary hover:underline text-sm">
          Alışverişe başla →
        </Link>
      </div>
    );
  }

  async function placeOrder() {
    if (!selectedAddressId) {
      show('Teslimat adresi seçin', 'error');
      return;
    }
    if (!agreed) {
      show('Mesafeli satış sözleşmesini onaylayın', 'error');
      return;
    }
    setPlacing(true);
    try {
      const result = await apiClient.post<{
        paymentRef: string;
        redirectUrl: string;
        orders: Array<{ id: string; orderNo: string; sellerId: string; totalCents: number }>;
      }>('/v1/orders', {
        shippingAddressId: selectedAddressId,
        ...(note ? { note } : {}),
        ...(couponCode ? { couponCode } : {}),
        ...(loyaltyPoints > 0 ? { loyaltyPoints } : {}),
      });
      emitCartUpdate();
      show('Ödeme sayfasına yönlendiriliyorsunuz…', 'info');
      window.location.href = result.redirectUrl;
    } catch (e) {
      show(e instanceof ClientApiError ? e.message : 'Sipariş alınamadı', 'error');
      setPlacing(false);
    }
  }

  async function refreshAddresses() {
    const list = await apiClient.get<Address[]>('/v1/addresses');
    setAddresses(list);
    if (!selectedAddressId && list[0]) setSelectedAddressId(list[0].id);
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        {/* Adres seçim */}
        <section className="rounded-lg bg-canvas border border-hairline p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">1. Teslimat adresi</h2>
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              className="text-sm text-primary hover:underline"
            >
              {adding ? 'İptal' : '+ Yeni adres'}
            </button>
          </div>

          {addresses === null ? (
            <p className="text-sm text-ink-muted80">Adresler yükleniyor…</p>
          ) : addresses.length === 0 && !adding ? (
            <p className="text-sm text-ink-muted80">
              Kayıtlı adresiniz yok. Yeni adres ekleyin.
            </p>
          ) : (
            !adding && (
              <ul className="space-y-2">
                {addresses.map((a) => (
                  <li key={a.id}>
                    <label
                      className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedAddressId === a.id
                          ? 'border-primary bg-primary/5'
                          : 'border-hairline hover:border-primary'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddressId === a.id}
                        onChange={() => setSelectedAddressId(a.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 text-sm">
                        <p className="font-medium">
                          {a.label} {a.isDefault && <span className="text-xs text-primary">(varsayılan)</span>}
                        </p>
                        <p className="text-ink-muted80">{a.recipientName} · {a.phone}</p>
                        <p className="text-ink-muted80">
                          {a.district}, {a.province} — {a.addressLine}
                        </p>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            )
          )}

          {adding && (
            <AddressForm
              onSuccess={() => {
                setAdding(false);
                void refreshAddresses();
              }}
              onCancel={() => setAdding(false)}
            />
          )}
        </section>

        {/* Kargo placeholder */}
        <section className="rounded-lg bg-canvas-parchment border border-hairline p-6">
          <h2 className="text-lg font-semibold text-ink-muted80">2. Kargo</h2>
          <p className="text-sm text-ink-muted80 mt-1">
            Faz 3.2 — satıcı tarafından gönderim (self-managed). Şu an ücretsiz olarak hesaplanıyor.
          </p>
        </section>

        {/* Ödeme placeholder */}
        <section className="rounded-lg bg-canvas-parchment border border-hairline p-6">
          <h2 className="text-lg font-semibold text-ink-muted80">3. Ödeme</h2>
          <p className="text-sm text-ink-muted80 mt-1">
            Faz 3.2 — Iyzico 3DS kart ekranı. Şu an "ödendi" olarak işaretleniyor (test akışı).
          </p>
        </section>

        {/* Not + sözleşme */}
        <section className="rounded-lg bg-canvas border border-hairline p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Satıcıya not (isteğe bağlı)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Özel istek, teslimat saati, vb."
              className="w-full px-3 py-2 border border-hairline rounded-md text-sm"
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1"
            />
            <span>
              Mesafeli satış sözleşmesini ve ön bilgilendirme formunu okudum, onaylıyorum.
              <span className="text-xs text-ink-muted80 block mt-1">
                (Faz 3.2'de gerçek PDF eklenecek.)
              </span>
            </span>
          </label>
        </section>
      </div>

      {/* Sipariş özeti */}
      <aside className="md:col-span-1">
        <div className="sticky top-20 rounded-lg border border-hairline bg-canvas p-5 space-y-4">
          <h2 className="font-semibold">Sipariş Özeti</h2>
          <ul className="space-y-2 text-sm divide-y divide-hairline">
            {cart.items.map((it) => (
              <li key={it.id} className="pt-2 first:pt-0 flex justify-between gap-3">
                <span className="line-clamp-2 flex-1">
                  {it.product.nameTr}
                  <span className="text-xs text-ink-muted80 block">
                    {Number(it.quantity)} {it.product.unit}
                  </span>
                </span>
                <span className="font-medium whitespace-nowrap">
                  {formatCents(
                    cart.totals.lineSummaries.find((l) => l.itemId === it.id)?.lineTotalCents ?? 0,
                  )}
                </span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 text-sm border-t border-hairline pt-3">
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
            <div className="flex justify-between text-ink-muted80">
              <dt>Kargo</dt>
              <dd>Ücretsiz</dd>
            </div>
            {couponDiscountCents > 0 && (
              <div className="flex justify-between text-green-700">
                <dt>Kupon</dt>
                <dd>−{formatCents(couponDiscountCents)}</dd>
              </div>
            )}
            {loyaltyDiscountCents > 0 && (
              <div className="flex justify-between text-green-700">
                <dt>Puan ({loyaltyPoints})</dt>
                <dd>−{formatCents(loyaltyDiscountCents)}</dd>
              </div>
            )}
            <div className="border-t border-hairline pt-2 mt-2 flex justify-between text-lg font-bold">
              <dt>Toplam</dt>
              <dd>
                {formatCents(
                  Math.max(0, cart.totals.totalCents - couponDiscountCents - loyaltyDiscountCents),
                )}
              </dd>
            </div>
          </dl>

          <div className="pt-3 border-t border-hairline space-y-3">
            <CouponInput
              cartSubtotalCents={cart.totals.subtotalCents}
              onApply={(res) => {
                setCouponCode(res?.code ?? null);
                setCouponDiscountCents(res?.discountCents ?? 0);
              }}
            />
            <LoyaltyRedeemSlider
              cartTotalCents={cart.totals.totalCents}
              onChange={(pts, cents) => {
                setLoyaltyPoints(pts);
                setLoyaltyDiscountCents(cents);
              }}
            />
          </div>
          <button
            type="button"
            onClick={placeOrder}
            disabled={placing || !selectedAddressId || !agreed}
            className="btn-primary w-full disabled:opacity-60"
          >
            {placing ? 'Sipariş veriliyor…' : 'Siparişi Tamamla'}
          </button>
        </div>
      </aside>
    </div>
  );
}
