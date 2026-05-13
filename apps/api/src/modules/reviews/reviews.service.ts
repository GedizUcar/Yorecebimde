import { Inject, Injectable } from '@nestjs/common';
import { and, avg, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import {
  orderItems,
  orders,
  productReviews,
  products,
  sellers,
  users,
} from '@yorecebimde/db/schema';
import { BusinessRuleError, ValidationError } from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

@Injectable()
export class ReviewsService {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  /** Müşteri sipariş'in delivered/completed order_item'ına yorum ekler. */
  async createForOrderItem(
    userId: string,
    orderItemId: string,
    rating: number,
    body: string | null,
    photos: string[],
  ) {
    if (rating < 1 || rating > 5) throw new ValidationError('Puan 1-5 arası olmalı');

    const [item] = await this.db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        sellerId: orderItems.sellerId,
        orderUserId: orders.userId,
        orderStatus: orders.status,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(eq(orderItems.id, orderItemId), isNull(orderItems.deletedAt)))
      .limit(1);
    if (!item) throw new ValidationError('Sipariş kalemi bulunamadı');
    if (item.orderUserId !== userId) throw new BusinessRuleError('Bu sipariş size ait değil');
    if (!['delivered', 'completed'].includes(item.orderStatus)) {
      throw new BusinessRuleError('Sipariş teslim alındıktan sonra yorum yazabilirsiniz');
    }

    const [existing] = await this.db
      .select({ id: productReviews.id })
      .from(productReviews)
      .where(eq(productReviews.orderItemId, orderItemId))
      .limit(1);
    if (existing) throw new BusinessRuleError('Bu ürün için zaten yorum yazdınız');

    const [review] = await this.db
      .insert(productReviews)
      .values({
        productId: item.productId,
        sellerId: item.sellerId,
        userId,
        orderItemId,
        rating,
        body,
        photos,
      })
      .returning();

    await this.refreshProductRating(item.productId);
    await this.refreshSellerRating(item.sellerId);

    return review!;
  }

  async listByProduct(productId: string, limit = 20, sort: 'newest' | 'highest' | 'lowest' = 'newest') {
    const order =
      sort === 'highest'
        ? desc(productReviews.rating)
        : sort === 'lowest'
          ? productReviews.rating
          : desc(productReviews.createdAt);

    const rows = await this.db
      .select({
        id: productReviews.id,
        rating: productReviews.rating,
        body: productReviews.body,
        photos: productReviews.photos,
        sellerReply: productReviews.sellerReply,
        sellerReplyAt: productReviews.sellerReplyAt,
        createdAt: productReviews.createdAt,
        userFirst: users.firstName,
        userLast: users.lastName,
      })
      .from(productReviews)
      .leftJoin(users, eq(users.id, productReviews.userId))
      .where(
        and(
          eq(productReviews.productId, productId),
          eq(productReviews.status, 'visible'),
          isNull(productReviews.deletedAt),
        ),
      )
      .orderBy(order)
      .limit(Math.min(limit, 100));

    return rows.map((r) => ({
      ...r,
      reviewerName: r.userFirst ? `${r.userFirst} ${r.userLast?.[0] ?? ''}.`.trim() : 'Anonim',
      userFirst: undefined,
      userLast: undefined,
    }));
  }

  /** Müşterinin yorum yazabileceği sipariş kalemleri (delivered/completed, henüz yorum yapmadığı). */
  async listReviewableForUser(userId: string) {
    const rows = await this.db
      .select({
        orderItemId: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        productName: orderItems.productNameSnapshot,
        orderNo: orders.orderNo,
        status: orders.status,
        deliveredAt: orders.deliveredAt,
        reviewId: productReviews.id,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .leftJoin(productReviews, eq(productReviews.orderItemId, orderItems.id))
      .where(
        and(
          eq(orders.userId, userId),
          inArray(orders.status, ['delivered', 'completed']),
          isNull(orderItems.deletedAt),
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(100);
    return rows;
  }

  async sellerReply(reviewId: string, sellerId: string, text: string) {
    if (!text.trim()) throw new ValidationError('Cevap boş olamaz');
    const [r] = await this.db
      .select()
      .from(productReviews)
      .where(eq(productReviews.id, reviewId))
      .limit(1);
    if (!r) throw new ValidationError('Yorum bulunamadı');
    if (r.sellerId !== sellerId) throw new BusinessRuleError('Bu yorum size ait değil');

    await this.db
      .update(productReviews)
      .set({ sellerReply: text, sellerReplyAt: new Date(), updatedAt: new Date() })
      .where(eq(productReviews.id, reviewId));
    return { ok: true };
  }

  async sellerPendingReviews(sellerId: string) {
    return this.db
      .select()
      .from(productReviews)
      .where(
        and(
          eq(productReviews.sellerId, sellerId),
          eq(productReviews.status, 'visible'),
          isNull(productReviews.sellerReply),
          isNull(productReviews.deletedAt),
        ),
      )
      .orderBy(desc(productReviews.createdAt))
      .limit(100);
  }

  /** Admin moderasyon listesi — tüm yorumlar (visible + hidden). */
  async adminList(filter?: {
    status?: 'visible' | 'hidden_by_admin' | 'removed_by_user';
    minRating?: number;
    maxRating?: number;
    limit?: number;
  }) {
    const where = [isNull(productReviews.deletedAt)];
    if (filter?.status) where.push(eq(productReviews.status, filter.status));

    const rows = await this.db
      .select({
        id: productReviews.id,
        productId: productReviews.productId,
        productName: products.nameTr,
        sellerName: sellers.displayName,
        userId: productReviews.userId,
        userFirst: users.firstName,
        rating: productReviews.rating,
        body: productReviews.body,
        photos: productReviews.photos,
        sellerReply: productReviews.sellerReply,
        status: productReviews.status,
        hiddenReason: productReviews.hiddenReason,
        createdAt: productReviews.createdAt,
      })
      .from(productReviews)
      .leftJoin(products, eq(products.id, productReviews.productId))
      .leftJoin(sellers, eq(sellers.id, productReviews.sellerId))
      .leftJoin(users, eq(users.id, productReviews.userId))
      .where(and(...where))
      .orderBy(desc(productReviews.createdAt))
      .limit(Math.min(filter?.limit ?? 100, 500));

    return rows.map((r) => ({
      ...r,
      reviewerName: r.userFirst ? `${r.userFirst}` : 'Anonim',
    }));
  }

  async adminHide(reviewId: string, reason: string) {
    await this.db
      .update(productReviews)
      .set({
        status: 'hidden_by_admin',
        hiddenReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(productReviews.id, reviewId));
    const [r] = await this.db
      .select({ productId: productReviews.productId, sellerId: productReviews.sellerId })
      .from(productReviews)
      .where(eq(productReviews.id, reviewId))
      .limit(1);
    if (r) {
      await this.refreshProductRating(r.productId);
      await this.refreshSellerRating(r.sellerId);
    }
  }

  async adminRestore(reviewId: string) {
    await this.db
      .update(productReviews)
      .set({
        status: 'visible',
        hiddenReason: null,
        updatedAt: new Date(),
      })
      .where(eq(productReviews.id, reviewId));
    const [r] = await this.db
      .select({ productId: productReviews.productId, sellerId: productReviews.sellerId })
      .from(productReviews)
      .where(eq(productReviews.id, reviewId))
      .limit(1);
    if (r) {
      await this.refreshProductRating(r.productId);
      await this.refreshSellerRating(r.sellerId);
    }
  }

  private async refreshProductRating(productId: string) {
    const [agg] = await this.db
      .select({
        avg: avg(productReviews.rating).mapWith(Number),
        count: count(productReviews.id).mapWith(Number),
      })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, productId),
          eq(productReviews.status, 'visible'),
          isNull(productReviews.deletedAt),
        ),
      );
    const avgVal = (agg?.avg ?? 0).toFixed(2);
    const cnt = agg?.count ?? 0;
    await this.db
      .update(products)
      .set({ ratingAvg: avgVal, ratingCount: cnt, updatedAt: new Date() })
      .where(eq(products.id, productId));
  }

  private async refreshSellerRating(sellerId: string) {
    const [agg] = await this.db
      .select({
        avg: avg(productReviews.rating).mapWith(Number),
        count: count(productReviews.id).mapWith(Number),
      })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.sellerId, sellerId),
          eq(productReviews.status, 'visible'),
          isNull(productReviews.deletedAt),
        ),
      );
    const avgVal = (agg?.avg ?? 0).toFixed(2);
    const cnt = agg?.count ?? 0;
    await this.db
      .update(sellers)
      .set({ ratingAvg: avgVal, ratingCount: cnt, updatedAt: new Date() })
      .where(eq(sellers.id, sellerId));
  }
}
