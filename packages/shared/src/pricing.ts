/**
 * Pricing Engine — pure, deterministic, test'lenebilir.
 *
 * Faz 2: ürün listesi + detay sayfası için fiyat hesabı
 * Faz 3: checkout/cart pricing'i de bunu kullanır
 *
 * Para hesaplaması bigint (kuruş) bazlı (bkz. money.ts). Float ASLA.
 *
 * Tüm fiyatlar **kullanıcının görüp sepete eklediği** birim için.
 */
import { add, applyPercentage, fromMajor, multiplyByQuantity, sub, ZERO, type Money } from './money.js';

/** Tek bir indirim kaydı (DB'deki discount row'unun sade hali). */
export type Discount =
  | { type: 'permanent'; percentage: number }
  | { type: 'time_based'; percentage: number; startsAt: Date; endsAt: Date }
  | { type: 'quantity_based'; tiers: ReadonlyArray<{ minQuantity: number; percentage: number }> };

/** Bir ürün için tüm aktif indirimler. */
export type ProductDiscounts = ReadonlyArray<Discount>;

/** Bir varyasyon (discrete mode). */
export type VariationOption = {
  /** Birim cinsinden miktar (örn. 1.5 kg → 1.5). */
  quantity: number;
  /** Override fiyat (toplam — birim fiyat × quantity değil). null ise base'den hesaplanır. */
  priceOverride?: Money | null;
};

/** Hesaplama input'u. */
export type CalculatePriceInput = {
  /** Birim başına fiyat (örn. ₺50/kg → fromMajor("50")). */
  baseUnitPrice: Money;
  /** Kullanıcının seçtiği miktar (kg, lt, adet vb. ürünün unit'inde). */
  quantity: number;
  /** Discrete mod: seçilen varyasyon (varsa priceOverride uygulanır). */
  variation?: VariationOption | null;
  /** Aktif indirimler (deleted_at IS NULL && is_active=true ile filter edilmiş). */
  discounts?: ProductDiscounts;
  /** Hesaplama anı (time_based indirim aktif mi kontrolü için). Varsayılan: now. */
  now?: Date;
};

/** Hesaplama sonucu. */
export type CalculatePriceOutput = {
  /** İndirim öncesi alt toplam (variation override veya base × qty). */
  subtotal: Money;
  /** Uygulanan en yüksek indirim — null ise indirim yok. */
  appliedDiscount: null | {
    type: Discount['type'];
    percentage: number;
    amount: Money;
  };
  /** İndirim sonrası ödenecek toplam. */
  total: Money;
};

const ZERO_MONEY = ZERO;

/**
 * Time-based indirim aktif mi?
 */
export function isTimeBasedDiscountActive(d: Extract<Discount, { type: 'time_based' }>, now: Date): boolean {
  return now >= d.startsAt && now <= d.endsAt;
}

/**
 * Quantity-based indirim için verilen miktar'a uyan en yüksek tier.
 * tiers boş veya tier eşleşmezse 0 döner.
 */
export function pickQuantityTier(
  d: Extract<Discount, { type: 'quantity_based' }>,
  quantity: number,
): number {
  let best = 0;
  for (const tier of d.tiers) {
    if (quantity >= tier.minQuantity && tier.percentage > best) {
      best = tier.percentage;
    }
  }
  return best;
}

/**
 * Verilen koşullarda uygulanabilir en yüksek indirim yüzdesi + türü.
 * Hiç indirim yoksa null.
 */
export function pickBestDiscount(
  discounts: ProductDiscounts,
  quantity: number,
  now: Date,
): { type: Discount['type']; percentage: number } | null {
  let best: { type: Discount['type']; percentage: number } | null = null;

  for (const d of discounts) {
    let percentage = 0;
    if (d.type === 'permanent') {
      percentage = d.percentage;
    } else if (d.type === 'time_based' && isTimeBasedDiscountActive(d, now)) {
      percentage = d.percentage;
    } else if (d.type === 'quantity_based') {
      percentage = pickQuantityTier(d, quantity);
    }
    if (percentage > (best?.percentage ?? 0)) {
      best = { type: d.type, percentage };
    }
  }

  return best;
}

/**
 * Bir ürün/varyasyon için ödenecek fiyatı hesaplar.
 *
 * Mantık:
 *   1. subtotal = variation.priceOverride ?? (baseUnitPrice × quantity)
 *      (discrete'te variation.quantity, ürünün unit'i cinsinden)
 *   2. indirimlerden en yüksek olanı seç
 *   3. total = subtotal − (subtotal × percentage)
 */
export function calculatePrice(input: CalculatePriceInput): CalculatePriceOutput {
  const { baseUnitPrice, quantity, variation, discounts, now } = input;

  if (quantity <= 0) {
    return { subtotal: ZERO_MONEY, appliedDiscount: null, total: ZERO_MONEY };
  }

  // 1) subtotal
  let subtotal: Money;
  if (variation?.priceOverride != null) {
    // override sabit fiyat; quantity zaten varyasyon içinde kabul edilir
    subtotal = variation.priceOverride;
  } else if (variation?.quantity) {
    subtotal = multiplyByQuantity(baseUnitPrice, variation.quantity);
  } else {
    subtotal = multiplyByQuantity(baseUnitPrice, quantity);
  }

  // 2) en iyi indirim
  const best = discounts && discounts.length > 0
    ? pickBestDiscount(discounts, quantity, now ?? new Date())
    : null;

  if (!best || best.percentage <= 0) {
    return { subtotal, appliedDiscount: null, total: subtotal };
  }

  // 3) indirim uygula
  const discountAmount = applyPercentage(subtotal, best.percentage);
  const total = sub(subtotal, discountAmount);

  return {
    subtotal,
    appliedDiscount: { type: best.type, percentage: best.percentage, amount: discountAmount },
    total,
  };
}

/**
 * KDV ayrıştırma. Ürün KDV "dahil" girilebilir veya "hariç" — DB'deki `kdv_included` bayrağı buna karar verir.
 *
 *   kdvIncluded=true  → total zaten KDV'li. KDV tutarı = total × kdvRate / (100 + kdvRate)
 *   kdvIncluded=false → total + KDV tutarı eklenir. KDV tutarı = total × kdvRate / 100
 */
export function calculateKdv(opts: {
  total: Money;
  kdvRate: number;
  kdvIncluded: boolean;
}): { netAmount: Money; kdvAmount: Money; grossAmount: Money } {
  const { total, kdvRate, kdvIncluded } = opts;
  if (kdvRate <= 0) {
    return { netAmount: total, kdvAmount: ZERO_MONEY, grossAmount: total };
  }

  // Bigint matematiği — rate'i 100x ölçekle (decimal precision için: %18 → 1800, %1 → 100, %8.5 → 850)
  const rateScaled = BigInt(Math.round(kdvRate * 100));

  if (kdvIncluded) {
    // total = net + kdv  →  kdv = total × rate / (10000 + rate)
    const kdv = (total * rateScaled) / (10000n + rateScaled);
    return { netAmount: sub(total, kdv), kdvAmount: kdv, grossAmount: total };
  } else {
    // gross = total + kdv  →  kdv = total × rate / 10000
    const kdv = (total * rateScaled) / 10000n;
    return { netAmount: total, kdvAmount: kdv, grossAmount: add(total, kdv) };
  }
}

/** Hızlı oluşturucu — testlerde sık kullanılır. */
export const _testHelpers = {
  permanentDiscount: (percentage: number): Discount => ({ type: 'permanent', percentage }),
  timeBasedDiscount: (percentage: number, startsAt: Date, endsAt: Date): Discount => ({
    type: 'time_based',
    percentage,
    startsAt,
    endsAt,
  }),
  quantityDiscount: (tiers: Array<{ minQuantity: number; percentage: number }>): Discount => ({
    type: 'quantity_based',
    tiers,
  }),
  money: fromMajor,
};
