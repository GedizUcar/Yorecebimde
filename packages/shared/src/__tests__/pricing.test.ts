import { describe, it, expect } from 'vitest';
import {
  calculatePrice,
  calculateKdv,
  pickBestDiscount,
  isTimeBasedDiscountActive,
  pickQuantityTier,
  _testHelpers,
  type Discount,
} from '../pricing';
import { fromMajor, toMajor } from '../money';

const m = _testHelpers.money;
const NOW = new Date('2026-05-12T12:00:00Z');

describe('calculatePrice — no discount', () => {
  it('baseUnitPrice × quantity (no variation)', () => {
    const result = calculatePrice({
      baseUnitPrice: m('50'),
      quantity: 2,
    });
    expect(toMajor(result.subtotal)).toBe('100.00');
    expect(result.appliedDiscount).toBeNull();
    expect(toMajor(result.total)).toBe('100.00');
  });

  it('discrete variation w/o override → base × variation.quantity', () => {
    const result = calculatePrice({
      baseUnitPrice: m('320'), // 320 ₺/kg
      quantity: 1,
      variation: { quantity: 0.5 }, // 500g
    });
    expect(toMajor(result.subtotal)).toBe('160.00');
  });

  it('variation priceOverride wins over base × qty', () => {
    const result = calculatePrice({
      baseUnitPrice: m('320'),
      quantity: 1,
      variation: { quantity: 1, priceOverride: m('299.99') },
    });
    expect(toMajor(result.subtotal)).toBe('299.99');
  });

  it('quantity <= 0 → zero', () => {
    const result = calculatePrice({ baseUnitPrice: m('100'), quantity: 0 });
    expect(toMajor(result.total)).toBe('0.00');
  });
});

describe('calculatePrice — single discount', () => {
  it('permanent %10', () => {
    const result = calculatePrice({
      baseUnitPrice: m('100'),
      quantity: 1,
      discounts: [_testHelpers.permanentDiscount(10)],
    });
    expect(toMajor(result.subtotal)).toBe('100.00');
    expect(result.appliedDiscount?.percentage).toBe(10);
    expect(toMajor(result.appliedDiscount!.amount)).toBe('10.00');
    expect(toMajor(result.total)).toBe('90.00');
  });

  it('time-based aktif aralıkta', () => {
    const result = calculatePrice({
      baseUnitPrice: m('100'),
      quantity: 1,
      discounts: [
        _testHelpers.timeBasedDiscount(20, new Date('2026-05-01'), new Date('2026-05-31')),
      ],
      now: NOW,
    });
    expect(result.appliedDiscount?.percentage).toBe(20);
    expect(toMajor(result.total)).toBe('80.00');
  });

  it('time-based aralık dışında — uygulanmaz', () => {
    const result = calculatePrice({
      baseUnitPrice: m('100'),
      quantity: 1,
      discounts: [
        _testHelpers.timeBasedDiscount(20, new Date('2026-06-01'), new Date('2026-06-30')),
      ],
      now: NOW,
    });
    expect(result.appliedDiscount).toBeNull();
    expect(toMajor(result.total)).toBe('100.00');
  });

  it('quantity-based — tier match', () => {
    const result = calculatePrice({
      baseUnitPrice: m('50'),
      quantity: 5,
      discounts: [
        _testHelpers.quantityDiscount([
          { minQuantity: 3, percentage: 10 },
          { minQuantity: 10, percentage: 20 },
        ]),
      ],
    });
    // 5 kg → 10% tier
    expect(result.appliedDiscount?.percentage).toBe(10);
    expect(toMajor(result.subtotal)).toBe('250.00');
    expect(toMajor(result.total)).toBe('225.00');
  });

  it('quantity-based — threshold altında', () => {
    const result = calculatePrice({
      baseUnitPrice: m('50'),
      quantity: 2,
      discounts: [_testHelpers.quantityDiscount([{ minQuantity: 3, percentage: 10 }])],
    });
    expect(result.appliedDiscount).toBeNull();
  });

  it('quantity-based — yüksek tier match', () => {
    const result = calculatePrice({
      baseUnitPrice: m('50'),
      quantity: 15,
      discounts: [
        _testHelpers.quantityDiscount([
          { minQuantity: 3, percentage: 10 },
          { minQuantity: 10, percentage: 20 },
        ]),
      ],
    });
    expect(result.appliedDiscount?.percentage).toBe(20);
  });
});

describe('calculatePrice — multiple discounts (en yüksek kazanır)', () => {
  it('permanent 10% + time-based 25% (aktif) → 25% kazanır', () => {
    const discounts: Discount[] = [
      _testHelpers.permanentDiscount(10),
      _testHelpers.timeBasedDiscount(25, new Date('2026-05-01'), new Date('2026-05-31')),
    ];
    const result = calculatePrice({
      baseUnitPrice: m('100'),
      quantity: 1,
      discounts,
      now: NOW,
    });
    expect(result.appliedDiscount?.percentage).toBe(25);
    expect(toMajor(result.total)).toBe('75.00');
  });

  it('permanent 30% + time-based 25% (aktif) → 30% kazanır (kullanıcı lehine)', () => {
    const result = calculatePrice({
      baseUnitPrice: m('100'),
      quantity: 1,
      discounts: [
        _testHelpers.permanentDiscount(30),
        _testHelpers.timeBasedDiscount(25, new Date('2026-05-01'), new Date('2026-05-31')),
      ],
      now: NOW,
    });
    expect(result.appliedDiscount?.percentage).toBe(30);
    expect(toMajor(result.total)).toBe('70.00');
  });

  it('permanent 10% + quantity-based 20% (qty=10) → 20% kazanır', () => {
    const result = calculatePrice({
      baseUnitPrice: m('50'),
      quantity: 10,
      discounts: [
        _testHelpers.permanentDiscount(10),
        _testHelpers.quantityDiscount([{ minQuantity: 10, percentage: 20 }]),
      ],
    });
    // 50 × 10 = 500 ₺, %20 = 100 ₺ indirim → 400 ₺
    expect(result.appliedDiscount?.percentage).toBe(20);
    expect(toMajor(result.total)).toBe('400.00');
  });

  it('quantity threshold tutmuyorsa permanent geçer', () => {
    const result = calculatePrice({
      baseUnitPrice: m('50'),
      quantity: 2,
      discounts: [
        _testHelpers.permanentDiscount(15),
        _testHelpers.quantityDiscount([{ minQuantity: 10, percentage: 30 }]),
      ],
    });
    expect(result.appliedDiscount?.percentage).toBe(15);
  });
});

describe('calculatePrice — TR gıda real-world senaryolar', () => {
  it('Ezine Beyaz Peynir 500g — 320 ₺/kg, %12.5 kalıcı indirim', () => {
    const result = calculatePrice({
      baseUnitPrice: m('320'),
      quantity: 0.5,
      variation: { quantity: 0.5 },
      discounts: [_testHelpers.permanentDiscount(12.5)],
    });
    // 320 × 0.5 = 160 ₺ subtotal
    // %12.5 indirim = 20 ₺
    // total = 140 ₺
    expect(toMajor(result.subtotal)).toBe('160.00');
    expect(toMajor(result.appliedDiscount!.amount)).toBe('20.00');
    expect(toMajor(result.total)).toBe('140.00');
  });

  it('Domates 5kg toptan — 25 ₺/kg, qty-discount [3kg+%10, 10kg+%20]', () => {
    const result = calculatePrice({
      baseUnitPrice: m('25'),
      quantity: 5,
      discounts: [
        _testHelpers.quantityDiscount([
          { minQuantity: 3, percentage: 10 },
          { minQuantity: 10, percentage: 20 },
        ]),
      ],
    });
    // 25 × 5 = 125 ₺
    // %10 indirim = 12.50 ₺
    // total = 112.50 ₺
    expect(toMajor(result.total)).toBe('112.50');
  });
});

describe('pickBestDiscount', () => {
  it('boş array → null', () => {
    expect(pickBestDiscount([], 1, NOW)).toBeNull();
  });

  it('sadece time-based, aralık dışında → null', () => {
    const d: Discount = _testHelpers.timeBasedDiscount(50, new Date('2025-01-01'), new Date('2025-12-31'));
    expect(pickBestDiscount([d], 1, NOW)).toBeNull();
  });
});

describe('isTimeBasedDiscountActive', () => {
  it('aralık içinde', () => {
    const d = _testHelpers.timeBasedDiscount(10, new Date('2026-05-01'), new Date('2026-05-31'));
    expect(isTimeBasedDiscountActive(d as Extract<Discount, { type: 'time_based' }>, NOW)).toBe(true);
  });
  it('aralık öncesi', () => {
    const d = _testHelpers.timeBasedDiscount(10, new Date('2026-06-01'), new Date('2026-06-30'));
    expect(isTimeBasedDiscountActive(d as Extract<Discount, { type: 'time_based' }>, NOW)).toBe(false);
  });
});

describe('pickQuantityTier', () => {
  it('en yüksek match return', () => {
    const d = _testHelpers.quantityDiscount([
      { minQuantity: 3, percentage: 10 },
      { minQuantity: 10, percentage: 20 },
      { minQuantity: 50, percentage: 35 },
    ]) as Extract<Discount, { type: 'quantity_based' }>;
    expect(pickQuantityTier(d, 1)).toBe(0);
    expect(pickQuantityTier(d, 5)).toBe(10);
    expect(pickQuantityTier(d, 25)).toBe(20);
    expect(pickQuantityTier(d, 100)).toBe(35);
  });
});

describe('calculateKdv', () => {
  it('KDV dahil 118 ₺ (%18) → net 100, kdv 18, gross 118', () => {
    const result = calculateKdv({ total: fromMajor('118'), kdvRate: 18, kdvIncluded: true });
    expect(toMajor(result.netAmount)).toBe('100.00');
    expect(toMajor(result.kdvAmount)).toBe('18.00');
    expect(toMajor(result.grossAmount)).toBe('118.00');
  });

  it('KDV hariç 100 ₺ (%20) → net 100, kdv 20, gross 120', () => {
    const result = calculateKdv({ total: fromMajor('100'), kdvRate: 20, kdvIncluded: false });
    expect(toMajor(result.netAmount)).toBe('100.00');
    expect(toMajor(result.kdvAmount)).toBe('20.00');
    expect(toMajor(result.grossAmount)).toBe('120.00');
  });

  it('KDV 0 → net=gross', () => {
    const result = calculateKdv({ total: fromMajor('100'), kdvRate: 0, kdvIncluded: true });
    expect(toMajor(result.netAmount)).toBe('100.00');
    expect(toMajor(result.kdvAmount)).toBe('0.00');
  });

  it('gıda KDV %1 — KDV dahil', () => {
    const result = calculateKdv({ total: fromMajor('101'), kdvRate: 1, kdvIncluded: true });
    expect(toMajor(result.netAmount)).toBe('100.00');
    expect(toMajor(result.kdvAmount)).toBe('1.00');
  });
});
