import { Inject, Injectable } from '@nestjs/common';
import type { FunctionCall } from '@yorecebimde/ai-bot';
import { auditLogs } from '@yorecebimde/db/schema';
import { CartService, type CartIdentity } from '../cart/cart.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { ProductsRepository } from '../products/products.repository.js';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import { logger } from '@yorecebimde/shared';

/**
 * Bot function calling executor. Gemini'den gelen `functionCall`'u backend
 * service çağrısına çevirir. Sonuç bot history'ye `function` rolüyle eklenir.
 *
 * Misafir kullanıcı için: addToCart device-id ile çalışır; placeOrder
 * LOGIN_REQUIRED döner.
 */
@Injectable()
export class BotFunctionsService {
  constructor(
    private readonly cart: CartService,
    private readonly orders: OrdersService,
    private readonly productsRepo: ProductsRepository,
    @Inject(DB_TOKEN) private readonly db: DbToken,
  ) {}

  async execute(
    call: FunctionCall,
    ctx: { userId: string | null; deviceId: string | null },
  ): Promise<Record<string, unknown>> {
    let result: Record<string, unknown>;
    let success = true;
    try {
      switch (call.name) {
        case 'searchProducts':
          result = await this.searchProducts(call.args);
          break;
        case 'getProductDetail':
          result = await this.getProductDetail(call.args);
          break;
        case 'getCart':
          result = await this.getCart(ctx);
          break;
        case 'addToCart':
          result = await this.addToCart(call.args, ctx);
          break;
        case 'placeOrder':
          result = await this.placeOrder(call.args, ctx);
          break;
        default:
          result = { error: 'UNKNOWN_FUNCTION', name: call.name };
          success = false;
      }
      if (result['error']) success = false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ err: msg, function: call.name }, 'bot function failed');
      result = { error: 'EXECUTION_ERROR', message: msg };
      success = false;
    }

    // Faz 7 — audit log per function call (best-effort, hata yutulur)
    void this.auditFunctionCall(call, ctx, result, success);
    return result;
  }

  private async auditFunctionCall(
    call: FunctionCall,
    ctx: { userId: string | null; deviceId: string | null },
    result: Record<string, unknown>,
    success: boolean,
  ) {
    try {
      await this.db.insert(auditLogs).values({
        actorUserId: ctx.userId,
        action: `bot.function.${call.name}`,
        targetType: 'bot_function',
        metadata: {
          args: call.args,
          success,
          errorCode: typeof result['error'] === 'string' ? result['error'] : undefined,
          deviceId: ctx.deviceId,
        },
      });
    } catch (err) {
      logger.warn({ err: String(err) }, 'bot audit log failed');
    }
  }

  // ───── functions ─────

  private async searchProducts(args: Record<string, unknown>) {
    const query = String(args['query'] ?? '').trim();
    if (!query) return { error: 'INVALID_QUERY' };
    const result = await this.productsRepo.publicListing({
      ...(typeof args['minPrice'] === 'number' ? { minPrice: args['minPrice'] } : {}),
      ...(typeof args['maxPrice'] === 'number' ? { maxPrice: args['maxPrice'] } : {}),
      onlyDiscounted: args['onlyDiscounted'] === true,
      page: 1,
      limit: 10,
    });

    // Basit ad bazlı match (Faz 6.3'te Meilisearch'e geçer)
    const q = query.toLowerCase();
    const matched = result.items.filter(
      (p) =>
        p.nameTr.toLowerCase().includes(q) ||
        (p.shortDescriptionTr?.toLowerCase().includes(q) ?? false),
    );
    const items = (matched.length > 0 ? matched : result.items).slice(0, 5);

    return {
      results: items.map((p) => ({
        productId: p.id,
        slug: p.slug,
        name: p.nameTr,
        unitPrice: Number(p.baseUnitPrice),
        unit: p.unit,
        stockQuantity: Number(p.stockQuantity),
        bestDiscountPct: p.bestDiscountPct ?? 0,
        seller: p.seller.displayName,
        url: `/urun/${p.seller.slug}/${p.slug}`,
      })),
      total: items.length,
    };
  }

  private async getProductDetail(args: Record<string, unknown>) {
    const productId = String(args['productId'] ?? '');
    if (!productId) return { error: 'INVALID_PRODUCT_ID' };

    const [p] = await this.productsRepo.findManyByIdsForListing([productId]);
    if (!p) return { error: 'NOT_FOUND' };

    return {
      productId: p.id,
      name: p.nameTr,
      shortDescription: p.shortDescriptionTr,
      unitPrice: Number(p.baseUnitPrice),
      unit: p.unit,
      stockQuantity: Number(p.stockQuantity),
      isColdChain: p.isColdChain,
      seller: p.seller.displayName,
      url: `/urun/${p.seller.slug}/${p.slug}`,
    };
  }

  private async getCart(ctx: { userId: string | null; deviceId: string | null }) {
    const identity = this.identity(ctx);
    if (!identity) return { error: 'NO_CART_CONTEXT' };
    const hydrated = await this.cart.getCart(identity);
    return {
      itemCount: hydrated.totals.itemCount,
      subtotalLiras: hydrated.totals.subtotalCents / 100,
      totalLiras: hydrated.totals.totalCents / 100,
      items: hydrated.items.map((i) => {
        const summary = hydrated.totals.lineSummaries.find((s) => s.itemId === i.id);
        return {
          productId: i.productId,
          name: i.product.nameTr,
          quantity: Number(i.quantity),
          unit: i.product.unit,
          lineTotalLiras: (summary?.lineTotalCents ?? 0) / 100,
        };
      }),
    };
  }

  private async addToCart(
    args: Record<string, unknown>,
    ctx: { userId: string | null; deviceId: string | null },
  ) {
    const identity = this.identity(ctx);
    if (!identity) return { error: 'NO_CART_CONTEXT', message: 'Cart için device-id veya login gerekli' };

    const productId = String(args['productId'] ?? '');
    const quantity = Number(args['quantity'] ?? 0);
    const variationId = args['variationId'] ? String(args['variationId']) : undefined;
    if (!productId || quantity <= 0) return { error: 'INVALID_ARGS' };

    const result = await this.cart.addItem(identity, {
      productId,
      quantity,
      ...(variationId ? { variationId } : {}),
    });
    return {
      ok: true,
      itemCount: result.totals.itemCount,
      totalLiras: result.totals.totalCents / 100,
    };
  }

  private async placeOrder(
    args: Record<string, unknown>,
    ctx: { userId: string | null; deviceId: string | null },
  ) {
    if (!ctx.userId) {
      return { error: 'LOGIN_REQUIRED', message: 'Sipariş için giriş yapmanız gerekli' };
    }
    const shippingAddressId = String(args['shippingAddressId'] ?? '');
    if (!shippingAddressId) {
      return { error: 'ADDRESS_REQUIRED', message: 'Teslimat adresi gerekli' };
    }
    const order = await this.orders.createFromCart(ctx.userId, {
      shippingAddressId,
      ...(typeof args['note'] === 'string' ? { note: args['note'] } : {}),
    });
    return { ok: true, order };
  }

  private identity(ctx: {
    userId: string | null;
    deviceId: string | null;
  }): CartIdentity | null {
    if (ctx.userId) return { kind: 'user', userId: ctx.userId };
    if (ctx.deviceId) return { kind: 'device', deviceId: ctx.deviceId };
    return null;
  }
}
