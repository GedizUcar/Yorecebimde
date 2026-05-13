/**
 * Meilisearch product document — listing'de gösterilen düşük-cardinality alanlar.
 * `id` Meili primary key olarak kullanılır.
 */
export type ProductSearchDoc = {
  id: string;
  slug: string;
  sellerId: string;
  sellerSlug: string;
  sellerName: string;
  nameTr: string;
  shortDescriptionTr: string | null;
  descriptionTrPreview: string | null;
  unit: string;
  baseUnitPrice: number; // numeric → number (TL cinsi)
  isColdChain: boolean;
  isActive: boolean;
  hasDiscount: boolean;
  bestDiscountPct: number;
  categorySlugs: string[];
  categoryNames: string[];
  ratingAvg: number;
  ratingCount: number;
  salesCount: number;
  createdAtUnix: number;
  // Image URLs (frontend kart için)
  thumbnailUrl: string | null;
};
