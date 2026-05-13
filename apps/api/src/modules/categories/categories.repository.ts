import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { categories } from '@yorecebimde/db/schema';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

export type CategoryRow = typeof categories.$inferSelect;
export type NewCategoryRow = typeof categories.$inferInsert;

export type CategoryWithChildren = CategoryRow & { children: CategoryWithChildren[] };

@Injectable()
export class CategoriesRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  /** Tek bir kategori — slug ile. */
  async findBySlug(slug: string): Promise<CategoryRow | null> {
    const rows = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.slug, slug), isNull(categories.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Tüm aktif kategoriler — flat liste, parent_id ile. */
  async listActive(): Promise<CategoryRow[]> {
    return this.db
      .select()
      .from(categories)
      .where(and(eq(categories.isActive, true), isNull(categories.deletedAt)))
      .orderBy(asc(categories.depth), asc(categories.sortOrder), asc(categories.nameTr));
  }

  /** Bir kategorinin direct child'ları. */
  async findChildren(parentId: string | null): Promise<CategoryRow[]> {
    return this.db
      .select()
      .from(categories)
      .where(
        and(
          parentId === null ? isNull(categories.parentId) : eq(categories.parentId, parentId),
          eq(categories.isActive, true),
          isNull(categories.deletedAt),
        ),
      )
      .orderBy(asc(categories.sortOrder), asc(categories.nameTr));
  }

  /**
   * Bir kategorinin breadcrumb'ı (atalar dahil kendisi). path'i parse eder.
   * Örn. path="/gida/sut-urunleri/peynir" → 3 kategori döner.
   */
  async findAncestorsBySlug(slug: string): Promise<CategoryRow[]> {
    const cat = await this.findBySlug(slug);
    if (!cat) return [];
    const slugs = cat.path.split('/').filter(Boolean);
    if (slugs.length === 0) return [];
    const all = await this.db
      .select()
      .from(categories)
      .where(and(inArray(categories.slug, slugs), isNull(categories.deletedAt)));
    return all.sort((a, b) => a.depth - b.depth);
  }

  /** Bir kategorinin tüm alt-ağaç ID'leri (kendisi dahil). path prefix ile. */
  async findDescendantIds(slug: string): Promise<string[]> {
    const cat = await this.findBySlug(slug);
    if (!cat) return [];
    const rows = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          sql`${categories.path} LIKE ${cat.path + '%'}`,
          eq(categories.isActive, true),
          isNull(categories.deletedAt),
        ),
      );
    return rows.map((r) => r.id);
  }

  /** Tüm ağacı nested yapıda döner — anasayfa kategori menüsü için. */
  async getTree(): Promise<CategoryWithChildren[]> {
    const all = await this.listActive();
    const byId = new Map<string, CategoryWithChildren>();
    const roots: CategoryWithChildren[] = [];

    for (const cat of all) {
      byId.set(cat.id, { ...cat, children: [] });
    }
    for (const cat of all) {
      const node = byId.get(cat.id)!;
      if (cat.parentId && byId.has(cat.parentId)) {
        byId.get(cat.parentId)!.children.push(node);
      } else if (!cat.parentId) {
        roots.push(node);
      }
    }
    return roots;
  }
}
