export type CartItemView = {
  id: string;
  cartId: string;
  productId: string;
  variationId: string | null;
  quantity: string;
  unitPriceSnapshot: string;
  product: {
    id: string;
    slug: string;
    nameTr: string;
    unit: string;
    baseUnitPrice: string;
    kdvRate: string;
    kdvIncluded: boolean;
    stockQuantity: string;
    isActive: boolean;
    seller: { id: string; slug: string; displayName: string };
    primaryImage: { thumbnailUrl: string | null; webpUrl: string | null; url: string } | null;
  };
  variation: { id: string; label: string; quantity: string; priceOverride: string | null } | null;
};

export type CartTotalsView = {
  subtotalCents: number;
  discountCents: number;
  kdvCents: number;
  totalCents: number;
  itemCount: number;
  lineSummaries: Array<{
    itemId: string;
    productId: string;
    variationId: string | null;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    discountCents: number;
  }>;
};

export type CartView = {
  cart: { id: string };
  items: CartItemView[];
  totals: CartTotalsView;
  warnings: string[];
};

export type EmptyCartView = { empty: true; items: []; totals: CartTotalsView };

export function isEmpty(c: CartView | EmptyCartView): c is EmptyCartView {
  return 'empty' in c && c.empty === true;
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
    cents / 100,
  );
}
