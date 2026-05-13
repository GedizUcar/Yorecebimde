/**
 * Kategori ağacı seed — yöresel gıda odaklı.
 * Hiyerarşik (parent-child), path otomatik.
 *
 * Çalıştırma: seed/index.ts içinden import edilir.
 */
import { uuidv7 } from 'uuidv7';
import type { Database } from '../src/client.js';
import { categories } from '../src/schema/categories.js';
import { sql } from 'drizzle-orm';

type SeedCategory = {
  slug: string;
  nameTr: string;
  nameEn?: string;
  defaultKdv?: number;
  children?: SeedCategory[];
};

const TREE: SeedCategory[] = [
  {
    slug: 'gida',
    nameTr: 'Gıda',
    nameEn: 'Food',
    defaultKdv: 1,
    children: [
      {
        slug: 'sut-urunleri',
        nameTr: 'Süt Ürünleri',
        nameEn: 'Dairy',
        children: [
          {
            slug: 'peynir',
            nameTr: 'Peynir',
            nameEn: 'Cheese',
            children: [
              { slug: 'beyaz-peynir', nameTr: 'Beyaz Peynir', nameEn: 'White Cheese' },
              { slug: 'kasar', nameTr: 'Kaşar', nameEn: 'Kashar' },
              { slug: 'tulum-peyniri', nameTr: 'Tulum Peyniri', nameEn: 'Tulum Cheese' },
              { slug: 'orgu-peyniri', nameTr: 'Örgü Peynir', nameEn: 'Braided Cheese' },
            ],
          },
          { slug: 'yogurt', nameTr: 'Yoğurt', nameEn: 'Yogurt' },
          { slug: 'tereyagi', nameTr: 'Tereyağı', nameEn: 'Butter' },
          { slug: 'ayran-kefir', nameTr: 'Ayran & Kefir', nameEn: 'Ayran & Kefir' },
        ],
      },
      {
        slug: 'bal-recel-pekmez',
        nameTr: 'Bal, Reçel & Pekmez',
        nameEn: 'Honey, Jam & Molasses',
        children: [
          { slug: 'bal', nameTr: 'Bal', nameEn: 'Honey' },
          { slug: 'recel', nameTr: 'Reçel', nameEn: 'Jam' },
          { slug: 'pekmez', nameTr: 'Pekmez', nameEn: 'Molasses' },
        ],
      },
      {
        slug: 'kuruyemis',
        nameTr: 'Kuruyemiş',
        nameEn: 'Nuts & Dried Fruits',
        children: [
          { slug: 'findik', nameTr: 'Fındık', nameEn: 'Hazelnut' },
          { slug: 'antep-fistigi', nameTr: 'Antep Fıstığı', nameEn: 'Pistachio' },
          { slug: 'ceviz', nameTr: 'Ceviz', nameEn: 'Walnut' },
          { slug: 'kuru-meyve', nameTr: 'Kuru Meyve', nameEn: 'Dried Fruit' },
        ],
      },
      {
        slug: 'baharat',
        nameTr: 'Baharat',
        nameEn: 'Spices',
        children: [
          { slug: 'kirmizi-pul-biber', nameTr: 'Kırmızı Pul Biber', nameEn: 'Red Pepper Flakes' },
          { slug: 'kekik', nameTr: 'Kekik', nameEn: 'Thyme' },
          { slug: 'sumak', nameTr: 'Sumak', nameEn: 'Sumac' },
        ],
      },
      {
        slug: 'sebze-meyve',
        nameTr: 'Sebze & Meyve',
        nameEn: 'Vegetables & Fruits',
        children: [
          { slug: 'taze', nameTr: 'Taze', nameEn: 'Fresh' },
          { slug: 'kurutulmus', nameTr: 'Kurutulmuş', nameEn: 'Dried' },
        ],
      },
      {
        slug: 'et-urunleri',
        nameTr: 'Et Ürünleri',
        nameEn: 'Meat Products',
        defaultKdv: 1,
        children: [
          { slug: 'sucuk', nameTr: 'Sucuk', nameEn: 'Sucuk' },
          { slug: 'pastirma', nameTr: 'Pastırma', nameEn: 'Pastırma' },
          { slug: 'kavurma', nameTr: 'Kavurma', nameEn: 'Roasted Meat' },
        ],
      },
      {
        slug: 'yaglar',
        nameTr: 'Yağlar',
        nameEn: 'Oils',
        children: [
          { slug: 'zeytinyagi', nameTr: 'Zeytinyağı', nameEn: 'Olive Oil' },
          { slug: 'tereyagi-saf', nameTr: 'Tereyağı (Saf)', nameEn: 'Pure Butter' },
        ],
      },
      { slug: 'tursu-salca', nameTr: 'Turşu & Salça', nameEn: 'Pickles & Tomato Paste' },
      { slug: 'hazir-yemek', nameTr: 'Hazır Yemek', nameEn: 'Ready Meals' },
      {
        slug: 'icecek',
        nameTr: 'İçecek',
        nameEn: 'Beverages',
        children: [
          { slug: 'cay-bitki', nameTr: 'Çay & Bitki Çayları', nameEn: 'Tea & Herbal' },
          { slug: 'serbet', nameTr: 'Şerbet & Şurup', nameEn: 'Syrup' },
        ],
      },
    ],
  },
];

async function insertTree(
  db: Database,
  nodes: SeedCategory[],
  parentId: string | null,
  parentPath: string,
  parentDepth: number,
  sortStart = 0,
): Promise<void> {
  let sortOrder = sortStart;
  for (const node of nodes) {
    const path = `${parentPath}/${node.slug}`;
    const id = uuidv7();
    await db.insert(categories).values({
      id,
      parentId,
      slug: node.slug,
      nameTr: node.nameTr,
      nameEn: node.nameEn ?? null,
      defaultKdvRate: String(node.defaultKdv ?? 8),
      defaultCommissionRate: '10.00',
      depth: parentDepth + 1,
      path,
      sortOrder: sortOrder++,
      isActive: true,
    });

    if (node.children?.length) {
      await insertTree(db, node.children, id, path, parentDepth + 1);
    }
  }
}

export async function seedCategories(db: Database): Promise<number> {
  // Idempotent: zaten dolu mu kontrol et
  const countRows = (await db.execute<{ count: string }>(
    sql`SELECT count(*)::text AS count FROM categories`,
  )) as unknown as Array<{ count: string }>;
  const existingCount = Number(countRows[0]?.count ?? 0);

  if (existingCount > 0) {
    return 0; // skip — zaten seedlenmiş
  }

  await insertTree(db, TREE, null, '', 0);

  const totalRows = (await db.execute<{ total: string }>(
    sql`SELECT count(*)::text AS total FROM categories`,
  )) as unknown as Array<{ total: string }>;
  return Number(totalRows[0]?.total ?? 0);
}
