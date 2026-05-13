import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import {
  productQuestions,
  products,
  users,
} from '@yorecebimde/db/schema';
import { BusinessRuleError, ValidationError } from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

@Injectable()
export class QuestionsService {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  async ask(userId: string, productId: string, body: string) {
    if (body.trim().length < 5) throw new ValidationError('Soru en az 5 karakter olmalı');
    const [product] = await this.db
      .select({ id: products.id, sellerId: products.sellerId })
      .from(products)
      .where(and(eq(products.id, productId), isNull(products.deletedAt)))
      .limit(1);
    if (!product) throw new ValidationError('Ürün bulunamadı');

    const [q] = await this.db
      .insert(productQuestions)
      .values({
        productId,
        sellerId: product.sellerId,
        userId,
        body: body.trim(),
      })
      .returning();
    return q!;
  }

  /** Ürün detayda gösterilen public Q&A listesi. */
  async listPublic(productId: string, limit = 20) {
    const rows = await this.db
      .select({
        id: productQuestions.id,
        body: productQuestions.body,
        answer: productQuestions.answer,
        answeredAt: productQuestions.answeredAt,
        createdAt: productQuestions.createdAt,
        userFirst: users.firstName,
      })
      .from(productQuestions)
      .leftJoin(users, eq(users.id, productQuestions.userId))
      .where(
        and(
          eq(productQuestions.productId, productId),
          eq(productQuestions.status, 'answered'),
          eq(productQuestions.isPublic, true),
          isNull(productQuestions.deletedAt),
        ),
      )
      .orderBy(desc(productQuestions.answeredAt))
      .limit(Math.min(limit, 100));

    return rows.map((r) => ({
      ...r,
      askerName: r.userFirst ? `${r.userFirst[0]}.` : 'Anonim',
      userFirst: undefined,
    }));
  }

  /** Satıcı paneli — bekleyen sorular. */
  async listPendingForSeller(sellerId: string) {
    return this.db
      .select()
      .from(productQuestions)
      .where(
        and(
          eq(productQuestions.sellerId, sellerId),
          eq(productQuestions.status, 'pending'),
          isNull(productQuestions.deletedAt),
        ),
      )
      .orderBy(desc(productQuestions.createdAt))
      .limit(100);
  }

  /** Satıcı cevap verir. isPublic=true ise public listede görünür. */
  async sellerAnswer(
    sellerId: string,
    userId: string,
    questionId: string,
    answer: string,
    isPublic: boolean,
  ) {
    if (answer.trim().length < 2) throw new ValidationError('Cevap boş olamaz');
    const [q] = await this.db
      .select()
      .from(productQuestions)
      .where(eq(productQuestions.id, questionId))
      .limit(1);
    if (!q) throw new ValidationError('Soru bulunamadı');
    if (q.sellerId !== sellerId) throw new BusinessRuleError('Bu soru size ait değil');

    await this.db
      .update(productQuestions)
      .set({
        answer: answer.trim(),
        answeredBy: userId,
        answeredAt: new Date(),
        isPublic,
        status: 'answered',
        updatedAt: new Date(),
      })
      .where(eq(productQuestions.id, questionId));
    return { ok: true };
  }
}
