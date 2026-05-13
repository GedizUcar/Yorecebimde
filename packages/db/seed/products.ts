/**
 * Test ürünleri seed — Ezine Çiftliği + Antep Baharat Evi'nden 11 ürün.
 * Varyasyonlar (discrete + stepper), indirimler (3 tip), kategoriler.
 *
 * Idempotent: zaten ürün varsa atlanır.
 */
import { uuidv7 } from 'uuidv7';
import { eq, sql } from 'drizzle-orm';
import type { Database } from '../src/client.js';
import {
  products,
  productVariations,
  productCategories,
  discounts,
  categories,
  sellers,
} from '../src/schema/index.js';

type SeedProduct = {
  slug: string;
  nameTr: string;
  nameEn?: string;
  descriptionTr: string;
  shortDescriptionTr: string;
  unit: 'kg' | 'g' | 'lt' | 'ml' | 'adet' | 'paket' | 'kasa' | 'demet' | 'tane';
  variationMode: 'none' | 'discrete' | 'stepper';
  stepperMin?: string;
  stepperMax?: string;
  stepperStep?: string;
  baseUnitPrice: string;
  kdvRate: string;
  kdvIncluded?: boolean;
  isColdChain?: boolean;
  weightGrams?: number;
  stockQuantity: string;
  categorySlugs: string[];
  primaryCategorySlug: string;
  variations?: Array<{ label: string; quantity: string; priceOverride?: string }>;
  discounts?: Array<
    | { type: 'permanent'; percentage: string }
    | { type: 'time_based'; percentage: string; startsAt: Date; endsAt: Date }
    | {
        type: 'quantity_based';
        tiers: Array<{ minQuantity: number; percentage: number }>;
      }
  >;
};

const NOW = new Date();
const IN_30_DAYS = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

const EZINE_PRODUCTS: SeedProduct[] = [
  {
    slug: 'ezine-beyaz-peyniri-tam-yagli',
    nameTr: 'Ezine Beyaz Peyniri (Tam Yağlı)',
    descriptionTr:
      'Çanakkale Ezine\'nin coğrafi işaretli beyaz peyniri. %100 inek sütünden, 3 ay olgunlaştırılmıştır. Tuzlu salamuralı, sofranıza taze ulaşır.',
    shortDescriptionTr: 'Coğrafi işaretli, tam yağlı, taze salamuralı.',
    unit: 'kg',
    variationMode: 'discrete',
    baseUnitPrice: '320.00',
    kdvRate: '1.00',
    kdvIncluded: true,
    isColdChain: true,
    weightGrams: 1000,
    stockQuantity: '50.000',
    categorySlugs: ['beyaz-peynir', 'sut-urunleri'],
    primaryCategorySlug: 'beyaz-peynir',
    variations: [
      { label: '500 g', quantity: '0.500' },
      { label: '1 kg', quantity: '1.000' },
      { label: '2 kg', quantity: '2.000', priceOverride: '600.00' },
    ],
    discounts: [{ type: 'permanent', percentage: '12.50' }],
  },
  {
    slug: 'koy-tereyagi-cig',
    nameTr: 'Köy Tereyağı (Çiğ)',
    descriptionTr:
      'Pastörize edilmemiş çiğ inek sütünden, geleneksel yayık yöntemiyle. Soğuk zincir korunarak gönderilir.',
    shortDescriptionTr: 'Çiğ süt, yayık yöntemi, soğuk zincir.',
    unit: 'kg',
    variationMode: 'discrete',
    baseUnitPrice: '450.00',
    kdvRate: '1.00',
    kdvIncluded: true,
    isColdChain: true,
    weightGrams: 500,
    stockQuantity: '30.000',
    categorySlugs: ['tereyagi', 'sut-urunleri'],
    primaryCategorySlug: 'tereyagi',
    variations: [
      { label: '500 g', quantity: '0.500' },
      { label: '1 kg', quantity: '1.000' },
    ],
  },
  {
    slug: 'suzme-yogurt',
    nameTr: 'Süzme Yoğurt',
    descriptionTr:
      'Geleneksel yayık yoğurttan süzülmüş, yoğun kıvamlı süzme yoğurt. 2 günlük taze süt ile.',
    shortDescriptionTr: 'Geleneksel yayık, süzülmüş, yoğun kıvam.',
    unit: 'kg',
    variationMode: 'stepper',
    stepperMin: '0.500',
    stepperMax: '5.000',
    stepperStep: '0.500',
    baseUnitPrice: '80.00',
    kdvRate: '1.00',
    kdvIncluded: true,
    isColdChain: true,
    stockQuantity: '40.000',
    categorySlugs: ['yogurt', 'sut-urunleri'],
    primaryCategorySlug: 'yogurt',
  },
  {
    slug: 'tulum-peyniri-erzincan',
    nameTr: 'Tulum Peyniri (Erzincan)',
    descriptionTr:
      'Erzincan tulum peyniri — yarı sert, tuzlu, deri tulum içinde olgunlaştırılmış. Mezeniz olmazsa olmaz.',
    shortDescriptionTr: 'Erzincan, deri tulum, 6 ay olgunlaşma.',
    unit: 'kg',
    variationMode: 'discrete',
    baseUnitPrice: '520.00',
    kdvRate: '1.00',
    kdvIncluded: true,
    isColdChain: true,
    weightGrams: 250,
    stockQuantity: '15.000',
    categorySlugs: ['tulum-peyniri', 'sut-urunleri'],
    primaryCategorySlug: 'tulum-peyniri',
    variations: [
      { label: '250 g', quantity: '0.250' },
      { label: '500 g', quantity: '0.500' },
    ],
    discounts: [{ type: 'time_based', percentage: '15.00', startsAt: NOW, endsAt: IN_30_DAYS }],
  },
  {
    slug: 'koy-yumurtasi',
    nameTr: 'Köy Yumurtası (Gezen Tavuk)',
    descriptionTr:
      'Doğal yemlerle beslenen gezen tavuklardan, organik. Sarısı turuncu, kabuğu kalın.',
    shortDescriptionTr: 'Gezen tavuk, doğal yem, organik.',
    unit: 'adet',
    variationMode: 'stepper',
    stepperMin: '10',
    stepperMax: '30',
    stepperStep: '10',
    baseUnitPrice: '6.00',
    kdvRate: '1.00',
    kdvIncluded: true,
    isColdChain: false,
    stockQuantity: '500',
    categorySlugs: ['gida'],
    primaryCategorySlug: 'gida',
  },
];

const ANTEP_PRODUCTS: SeedProduct[] = [
  {
    slug: 'antep-fistigi-ic',
    nameTr: 'Antep Fıstığı (İç)',
    descriptionTr:
      'Gaziantep\'in coğrafi işaretli iç fıstığı. Yeşil ve aromatik. Tatlıcılar ve damak zevki yüksek olanlar için.',
    shortDescriptionTr: 'Coğrafi işaretli, iç, yeşil aromatik.',
    unit: 'kg',
    variationMode: 'discrete',
    baseUnitPrice: '850.00',
    kdvRate: '1.00',
    kdvIncluded: true,
    weightGrams: 250,
    stockQuantity: '20.000',
    categorySlugs: ['antep-fistigi', 'kuruyemis'],
    primaryCategorySlug: 'antep-fistigi',
    variations: [
      { label: '250 g', quantity: '0.250' },
      { label: '500 g', quantity: '0.500' },
      { label: '1 kg', quantity: '1.000' },
    ],
  },
  {
    slug: 'antep-baklavalik-fistik',
    nameTr: 'Antep Baklavalık Fıstık',
    descriptionTr:
      'Baklava ve tatlılar için özel olarak hazırlanmış, kabuksuz, ince doğranmış Antep fıstığı.',
    shortDescriptionTr: 'Baklavalık, ince doğranmış, taze çekilmiş.',
    unit: 'kg',
    variationMode: 'discrete',
    baseUnitPrice: '950.00',
    kdvRate: '1.00',
    kdvIncluded: true,
    weightGrams: 1000,
    stockQuantity: '15.000',
    categorySlugs: ['antep-fistigi', 'kuruyemis'],
    primaryCategorySlug: 'antep-fistigi',
    variations: [
      { label: '1 kg', quantity: '1.000' },
      { label: '2 kg', quantity: '2.000' },
    ],
    discounts: [
      {
        type: 'quantity_based',
        tiers: [
          { minQuantity: 2, percentage: 10 },
          { minQuantity: 5, percentage: 15 },
        ],
      },
    ],
  },
  {
    slug: 'kirmizi-pul-biber-maras',
    nameTr: 'Kırmızı Pul Biber (Maraş)',
    descriptionTr:
      'Kahramanmaraş\'tan, yağlı tatlı pul biber. Acılık seviyesi orta, koyu kırmızı renk.',
    shortDescriptionTr: 'Maraş, yağlı tatlı, orta acı.',
    unit: 'kg',
    variationMode: 'discrete',
    baseUnitPrice: '220.00',
    kdvRate: '1.00',
    kdvIncluded: true,
    weightGrams: 100,
    stockQuantity: '40.000',
    categorySlugs: ['kirmizi-pul-biber', 'baharat'],
    primaryCategorySlug: 'kirmizi-pul-biber',
    variations: [
      { label: '100 g', quantity: '0.100' },
      { label: '250 g', quantity: '0.250' },
      { label: '500 g', quantity: '0.500' },
    ],
  },
  {
    slug: 'sumak',
    nameTr: 'Sumak (Toz)',
    descriptionTr:
      'Doğu Anadolu\'dan, taze toplanmış, ince çekilmiş sumak. Salata ve kebap için.',
    shortDescriptionTr: 'Doğu Anadolu, taze, ince çekim.',
    unit: 'kg',
    variationMode: 'discrete',
    baseUnitPrice: '180.00',
    kdvRate: '1.00',
    kdvIncluded: true,
    weightGrams: 100,
    stockQuantity: '25.000',
    categorySlugs: ['sumak', 'baharat'],
    primaryCategorySlug: 'sumak',
    variations: [
      { label: '100 g', quantity: '0.100' },
      { label: '250 g', quantity: '0.250' },
    ],
  },
  {
    slug: 'antep-kekik',
    nameTr: 'Antep Kekik',
    descriptionTr: 'El ile toplanmış, gölgede kurutulmuş Antep dağ kekiği. Yoğun aroma.',
    shortDescriptionTr: 'El toplaması, gölgede kuru, yoğun aroma.',
    unit: 'kg',
    variationMode: 'discrete',
    baseUnitPrice: '240.00',
    kdvRate: '1.00',
    kdvIncluded: true,
    weightGrams: 50,
    stockQuantity: '20.000',
    categorySlugs: ['kekik', 'baharat'],
    primaryCategorySlug: 'kekik',
    variations: [
      { label: '50 g', quantity: '0.050' },
      { label: '100 g', quantity: '0.100' },
    ],
  },
  {
    slug: 'cig-findik-giresun',
    nameTr: 'Çiğ Fındık (Giresun)',
    descriptionTr:
      'Giresun\'un meşhur kalın kabuklu fındığı. Kabuksuz, çiğ. Taze, içi kütür kütür.',
    shortDescriptionTr: 'Giresun, kabuksuz, çiğ, taze.',
    unit: 'kg',
    variationMode: 'discrete',
    baseUnitPrice: '380.00',
    kdvRate: '1.00',
    kdvIncluded: true,
    weightGrams: 500,
    stockQuantity: '30.000',
    categorySlugs: ['findik', 'kuruyemis'],
    primaryCategorySlug: 'findik',
    variations: [
      { label: '500 g', quantity: '0.500' },
      { label: '1 kg', quantity: '1.000' },
    ],
    discounts: [{ type: 'permanent', percentage: '8.00' }],
  },
];

async function insertProduct(
  db: Database,
  sellerId: string,
  product: SeedProduct,
): Promise<void> {
  const productId = uuidv7();

  // 1. Ürün
  await db.insert(products).values({
    id: productId,
    sellerId,
    slug: product.slug,
    nameTr: product.nameTr,
    nameEn: product.nameEn ?? null,
    descriptionTr: product.descriptionTr,
    shortDescriptionTr: product.shortDescriptionTr,
    unit: product.unit,
    variationMode: product.variationMode,
    stepperMin: product.stepperMin ?? null,
    stepperMax: product.stepperMax ?? null,
    stepperStep: product.stepperStep ?? null,
    baseUnitPrice: product.baseUnitPrice,
    kdvRate: product.kdvRate,
    kdvIncluded: product.kdvIncluded ?? true,
    isColdChain: product.isColdChain ?? false,
    weightGrams: product.weightGrams ?? null,
    stockQuantity: product.stockQuantity,
    isActive: true,
  });

  // 2. Kategoriler
  for (const catSlug of product.categorySlugs) {
    const cat = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, catSlug))
      .limit(1);
    if (cat[0]) {
      await db.insert(productCategories).values({
        productId,
        categoryId: cat[0].id,
        sellerId,
        isPrimary: catSlug === product.primaryCategorySlug,
      });
    }
  }

  // 3. Varyasyonlar
  if (product.variations) {
    let sortOrder = 0;
    for (const v of product.variations) {
      await db.insert(productVariations).values({
        productId,
        sellerId,
        label: v.label,
        quantity: v.quantity,
        priceOverride: v.priceOverride ?? null,
        sortOrder: sortOrder++,
        isActive: true,
      });
    }
  }

  // 4. İndirimler
  if (product.discounts) {
    for (const d of product.discounts) {
      if (d.type === 'permanent') {
        await db.insert(discounts).values({
          productId,
          sellerId,
          type: 'permanent',
          percentage: d.percentage,
          isActive: true,
        });
      } else if (d.type === 'time_based') {
        await db.insert(discounts).values({
          productId,
          sellerId,
          type: 'time_based',
          percentage: d.percentage,
          startsAt: d.startsAt,
          endsAt: d.endsAt,
          isActive: true,
        });
      } else if (d.type === 'quantity_based') {
        await db.insert(discounts).values({
          productId,
          sellerId,
          type: 'quantity_based',
          tiers: d.tiers,
          isActive: true,
        });
      }
    }
  }
}

export async function seedProducts(db: Database): Promise<number> {
  // Idempotent
  const countRows = (await db.execute<{ count: string }>(
    sql`SELECT count(*)::text AS count FROM products`,
  )) as unknown as Array<{ count: string }>;
  if (Number(countRows[0]?.count ?? 0) > 0) {
    return 0;
  }

  const ezineRows = await db
    .select({ id: sellers.id })
    .from(sellers)
    .where(eq(sellers.slug, 'ezine-ciftligi'))
    .limit(1);
  const antepRows = await db
    .select({ id: sellers.id })
    .from(sellers)
    .where(eq(sellers.slug, 'antep-baharat-evi'))
    .limit(1);

  const ezineId = ezineRows[0]?.id;
  const antepId = antepRows[0]?.id;

  if (!ezineId || !antepId) {
    throw new Error('Test satıcılar bulunamadı — önce sellers seed çalıştır');
  }

  let total = 0;
  for (const p of EZINE_PRODUCTS) {
    await insertProduct(db, ezineId, p);
    total++;
  }
  for (const p of ANTEP_PRODUCTS) {
    await insertProduct(db, antepId, p);
    total++;
  }

  return total;
}
