/**
 * API response tipleri — frontend ile NestJS backend arasındaki sözleşme.
 * Faz 7'de @yorecebimde/shared schema'larından openapi-typescript ile auto-generate edilecek.
 */

export type Category = {
  id: string;
  parentId: string | null;
  slug: string;
  nameTr: string;
  nameEn: string | null;
  descriptionTr: string | null;
  descriptionEn: string | null;
  iconUrl: string | null;
  coverUrl: string | null;
  defaultKdvRate: string;
  defaultCommissionRate: string;
  sortOrder: number;
  isActive: boolean;
  depth: number;
  path: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CategoryWithChildren = Category & { children: CategoryWithChildren[] };

export type CategoryDetail = Category & {
  breadcrumb: Category[];
  children: Category[];
};

export type ProductImage = {
  id: string;
  productId: string;
  url: string;
  webpUrl: string | null;
  thumbnailUrl: string | null;
  altText: string | null;
  sortOrder: number;
  width: number | null;
  height: number | null;
};

export type ProductVariation = {
  id: string;
  productId: string;
  label: string;
  quantity: string;
  priceOverride: string | null;
  sku: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type Discount = {
  id: string;
  productId: string;
  type: 'permanent' | 'time_based' | 'quantity_based';
  percentage: string | null;
  startsAt: string | null;
  endsAt: string | null;
  tiers: Array<{ minQuantity: number; percentage: number }> | null;
  isActive: boolean;
};

export type Product = {
  id: string;
  sellerId: string;
  slug: string;
  nameTr: string;
  nameEn: string | null;
  descriptionTr: string | null;
  shortDescriptionTr: string | null;
  unit: 'kg' | 'g' | 'lt' | 'ml' | 'adet' | 'paket' | 'kasa' | 'demet' | 'tane';
  variationMode: 'none' | 'discrete' | 'stepper';
  stepperMin: string | null;
  stepperMax: string | null;
  stepperStep: string | null;
  baseUnitPrice: string;
  kdvRate: string;
  kdvIncluded: boolean;
  isColdChain: boolean;
  weightGrams: number | null;
  stockQuantity: string;
  isActive: boolean;
  ratingAvg: string;
  ratingCount: number;
  viewCount: number;
  salesCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductWithRelations = Product & {
  seller: { id: string; slug: string; displayName: string };
  categories: Array<{ id: string; slug: string; nameTr: string; isPrimary: boolean }>;
  images: ProductImage[];
  variations: ProductVariation[];
  discounts: Discount[];
  formattedBasePrice?: string;
};

/** Listing endpoint cevabı — kart üzerinde göstermek için seller + indirim özeti. */
export type ListingProduct = Product & {
  seller: { id: string; slug: string; displayName: string };
  bestDiscountPct?: number;
  hasQuantityDiscount?: boolean;
  primaryImage?: {
    url: string;
    webpUrl: string | null;
    thumbnailUrl: string | null;
  };
};
