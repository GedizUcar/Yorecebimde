import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { sellers, users, authUser } from '@yorecebimde/db/schema';
import {
  BusinessRuleError,
  NotFoundError,
  ForbiddenError,
  logger,
} from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import { AddressesRepository } from '../addresses/addresses.repository.js';
import {
  CartService,
  type CartIdentity,
  type HydratedCart,
} from '../cart/cart.service.js';
import { StockService } from '../products/stock.service.js';
import { NotificationTriggers } from '../notifications/triggers.js';
import { PaymentsService } from '../payments/payments.service.js';
import { InvoicingService } from '../invoicing/invoicing.service.js';
import { LoyaltyService } from '../loyalty/loyalty.service.js';
import { ReferralService } from '../referral/referral.service.js';
import { CouponsService } from '../coupons/coupons.service.js';
import {
  OrdersRepository,
  type NewOrderItemRow,
  type NewOrderRow,
  type OrderRow,
} from './orders.repository.js';

export const createOrderSchema = z.object({
  shippingAddressId: z.string().uuid(),
  billingAddressId: z.string().uuid().optional(),
  note: z.string().max(1000).optional(),
  couponCode: z.string().min(2).max(50).optional(),
  loyaltyPoints: z.number().int().nonnegative().optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Sipariş durum geçişleri — `from` → `allowed[]`.
 *
 * Faz 3.2 flow:
 *   created → pending_payment (3DS başlatıldı) → paid (callback OK) → confirmed → preparing → shipped → delivered → completed
 *   Her aşamadan cancelled (paid sonrasında refund tetiklenir)
 */
const TRANSITIONS: Record<OrderRow['status'], OrderRow['status'][]> = {
  created: ['pending_payment', 'paid', 'cancelled'],
  pending_payment: ['paid', 'cancelled'],
  paid: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'return_requested'],
  delivered: ['completed', 'return_requested', 'disputed'],
  completed: [],
  cancelled: [],
  return_requested: ['returned', 'disputed'],
  returned: ['refunded'],
  refunded: [],
  disputed: ['resolved', 'refunded'],
  resolved: ['completed', 'refunded'],
};

type CreatedOrderSummary = {
  id: string;
  orderNo: string;
  sellerId: string;
  totalCents: number;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly repo: OrdersRepository,
    private readonly cart: CartService,
    private readonly addresses: AddressesRepository,
    private readonly stock: StockService,
    private readonly triggers: NotificationTriggers,
    @Inject(forwardRef(() => PaymentsService))
    private readonly payments: PaymentsService,
    private readonly invoicing: InvoicingService,
    private readonly loyalty: LoyaltyService,
    private readonly referral: ReferralService,
    private readonly coupons: CouponsService,
    @Inject(DB_TOKEN) private readonly db: DbToken,
  ) {}

  /**
   * Sipariş `refunded`/`cancelled` olunca — coupon usage revoke + loyalty
   * refund (redeem geri verilir, earn varsa iptal).
   */
  private async onOrderRefunded(orderId: string) {
    try {
      await this.coupons.revokeForOrder(orderId);
    } catch (err) {
      logger.warn({ err: String(err), orderId }, 'coupon revoke failed');
    }
    try {
      const result = await this.loyalty.refundForOrder(orderId);
      logger.info({ orderId, ...result }, 'loyalty refund applied');
    } catch (err) {
      logger.warn({ err: String(err), orderId }, 'loyalty refund failed');
    }
  }

  /**
   * Sipariş `completed` olunca tetiklenir — loyalty earn + referral first-order
   * reward. Hatalar yutulur (sipariş tamamlandı, side-effect best-effort).
   */
  private async onOrderCompleted(order: {
    id: string;
    userId: string;
    totalCents: number;
    orderNo?: string;
  }) {
    const subtotalLiras = order.totalCents / 100;
    try {
      const earnedTx = await this.loyalty.earnFromOrder(
        order.userId,
        order.id,
        subtotalLiras,
      );
      if (earnedTx && earnedTx.points > 0 && order.orderNo) {
        const buyer = await this.loadBuyer(order.userId);
        await this.triggers
          .loyaltyEarned(buyer, earnedTx.points, order.orderNo)
          .catch(() => undefined);
      }
    } catch (err) {
      logger.warn({ err: String(err), orderId: order.id }, 'loyalty earn failed');
    }
    try {
      const referralResult = await this.referral.maybeCompleteOnFirstOrder(
        order.userId,
        order.id,
      );
      if (referralResult) {
        const referrer = await this.loadBuyer(referralResult.referrerUserId);
        const referee = await this.loadBuyer(order.userId);
        const refereeName = referee.name ?? referee.email.split('@')[0] ?? 'arkadaşın';
        await this.triggers
          .referralCompleted(referrer, referralResult.points, refereeName)
          .catch(() => undefined);
      }
    } catch (err) {
      logger.warn({ err: String(err), orderId: order.id }, 'referral complete failed');
    }
  }

  /**
   * Sepetten sipariş(ler) oluştur — multi-seller split:
   *   1. Sepet → satıcı bazında gruplanır
   *   2. Her grup için ayrı order + items insert (atomic per-seller)
   *   3. Stok düşürülür
   *   4. Iyzico 3DS başlatılır → kullanıcı browser'da onayla/reddet
   *   5. Sepet temizlenir
   *   6. Status = pending_payment (callback paid'e geçirir)
   */
  async createFromCart(userId: string, input: CreateOrderInput) {
    const identity: CartIdentity = { kind: 'user', userId };
    const cartView = await this.cart.getCart(identity);
    if (cartView.items.length === 0) throw new BusinessRuleError('Sepet boş');
    if (cartView.warnings.length > 0) {
      throw new BusinessRuleError('Sepette sorunlu ürünler var', {
        warnings: cartView.warnings,
      });
    }

    const shipping = await this.addresses.findByUserAndId(userId, input.shippingAddressId);
    if (!shipping) throw new NotFoundError('Address', input.shippingAddressId);
    const billing = input.billingAddressId
      ? await this.addresses.findByUserAndId(userId, input.billingAddressId)
      : null;
    if (input.billingAddressId && !billing) {
      throw new NotFoundError('Address', input.billingAddressId);
    }

    // Satıcıya göre grupla
    const grouped = groupBySeller(cartView);
    const paymentRef = `pay-${userId.substring(0, 8)}-${Date.now()}`;

    // Faz 6.2 — kupon + loyalty pre-validation (atomik order create öncesi)
    let couponValidation: Awaited<ReturnType<CouponsService['validate']>> | null = null;
    if (input.couponCode) {
      couponValidation = await this.coupons.validate(
        input.couponCode,
        userId,
        cartView.totals.subtotalCents,
      );
    }
    let loyaltyRedeemRequest: { points: number; discountCents: number } | null = null;
    if (input.loyaltyPoints && input.loyaltyPoints > 0) {
      const bal = await this.loyalty.getBalance(userId);
      if (bal.balance < input.loyaltyPoints) {
        throw new BusinessRuleError('Yetersiz puan bakiyesi');
      }
      const discountLiras = this.loyalty.pointsToLiras(input.loyaltyPoints);
      loyaltyRedeemRequest = {
        points: input.loyaltyPoints,
        discountCents: Math.floor(discountLiras * 100),
      };
    }
    const totalExtraDiscount =
      (couponValidation?.discountCents ?? 0) + (loyaltyRedeemRequest?.discountCents ?? 0);

    const createdOrders: CreatedOrderSummary[] = [];
    let grandTotal = 0;
    let primaryOrderId: string | null = null;

    for (const [sellerId, group] of grouped.entries()) {
      // Stok düşür
      const tempOrderId = crypto.randomUUID();
      for (const it of group.items) {
        await this.stock.decreaseForSale(
          sellerId,
          it.productId,
          Number(it.quantity),
          tempOrderId,
        );
      }

      const orderData: Omit<NewOrderRow, 'orderNo'> = {
        userId,
        sellerId,
        shippingAddressId: shipping.id,
        ...(billing ? { billingAddressId: billing.id } : {}),
        shippingAddressSnapshot: shipping,
        ...(billing ? { billingAddressSnapshot: billing } : {}),
        status: 'pending_payment',
        subtotalCents: group.totals.subtotalCents,
        discountCents: group.totals.discountCents,
        shippingCents: 0,
        kdvCents: group.totals.kdvCents,
        totalCents: group.totals.totalCents,
        paymentProvider: 'iyzico',
        paymentRef,
        ...(input.note ? { note: input.note } : {}),
      };

      const itemsData: Omit<NewOrderItemRow, 'orderId'>[] = group.items.map((it) => {
        const ls = cartView.totals.lineSummaries.find((l) => l.itemId === it.id);
        return {
          productId: it.productId,
          sellerId,
          ...(it.variationId ? { variationId: it.variationId } : {}),
          productNameSnapshot: it.product.nameTr,
          ...(it.variation ? { variationLabelSnapshot: it.variation.label } : {}),
          unitSnapshot: it.product.unit,
          quantity: it.quantity,
          unitPriceCents: ls?.unitPriceCents ?? 0,
          lineTotalCents: ls?.lineTotalCents ?? 0,
          discountCents: ls?.discountCents ?? 0,
          kdvRate: it.product.kdvRate,
        };
      });

      const { order } = await this.repo.createOrderWithItems(orderData, itemsData);
      createdOrders.push({
        id: order.id,
        orderNo: order.orderNo,
        sellerId,
        totalCents: order.totalCents,
      });
      grandTotal += order.totalCents;
      if (!primaryOrderId) primaryOrderId = order.id;
    }

    // Faz 6.2 — kupon + loyalty apply (primary order'a iliştir, refund'da revoke için)
    if (couponValidation && primaryOrderId) {
      try {
        await this.coupons.applyToOrder(
          couponValidation.couponId,
          userId,
          primaryOrderId,
          couponValidation.discountCents,
        );
      } catch (err) {
        logger.warn({ err: String(err), orderId: primaryOrderId }, 'coupon apply failed');
      }
    }
    if (loyaltyRedeemRequest && primaryOrderId) {
      try {
        await this.loyalty.redeem(userId, loyaltyRedeemRequest.points, primaryOrderId);
      } catch (err) {
        logger.warn({ err: String(err), orderId: primaryOrderId }, 'loyalty redeem failed');
      }
    }

    // Faz 7 — multi-seller apportionment: kupon + loyalty indirimini her order'a
    // subtotal payına göre dağıt. Son order rounding remainder'ı alır.
    if (totalExtraDiscount > 0 && createdOrders.length > 0 && grandTotal > 0) {
      let distributed = 0;
      const lastIdx = createdOrders.length - 1;
      for (let i = 0; i < createdOrders.length; i++) {
        const o = createdOrders[i]!;
        const share =
          i === lastIdx
            ? totalExtraDiscount - distributed
            : Math.floor((o.totalCents / grandTotal) * totalExtraDiscount);
        if (share > 0) {
          await this.repo.applyExtraDiscount(o.id, share);
          o.totalCents = Math.max(0, o.totalCents - share);
          distributed += share;
        }
      }
    }

    // Sepeti temizle
    await this.cart.clear(identity);

    // 3DS başlat (toplam tutar − kupon + loyalty indirimi)
    const payableTotal = Math.max(0, grandTotal - totalExtraDiscount);
    const buyer = await this.loadBuyer(userId);
    const intent = await this.payments.initiate3DS({
      paymentRef,
      amountCents: payableTotal,
      buyerEmail: buyer.email,
      callbackPath: '/api/v1/webhooks/iyzico/callback',
    });

    return {
      paymentRef,
      redirectUrl: intent.redirectUrl,
      orders: createdOrders,
      discounts: {
        couponDiscountCents: couponValidation?.discountCents ?? 0,
        loyaltyDiscountCents: loyaltyRedeemRequest?.discountCents ?? 0,
        payableTotalCents: payableTotal,
      },
    };
  }

  /**
   * Iyzico callback'ten gelen token ile ödemeyi doğrula:
   *   - başarılı → paymentRef'e bağlı tüm orderları paid + bildirim + e-Arşiv
   *   - başarısız → orderları cancelled + stoğu geri yükle (Faz 3.3)
   */
  async handlePaymentCallback(token: string) {
    const result = await this.payments.verifyCallback(token);
    if (!result.paymentRef) {
      throw new BusinessRuleError('Geçersiz ödeme tokenı');
    }

    const orders = await this.repo.findByPaymentRef(result.paymentRef);
    if (orders.length === 0) {
      throw new NotFoundError('Order', result.paymentRef);
    }

    if (!result.success) {
      for (const o of orders) {
        if (o.status === 'pending_payment') {
          await this.repo.updateStatus(o.id, 'cancelled', {
            cancelledAt: new Date(),
            cancelReason: 'Ödeme başarısız',
          });
        }
      }
      return { success: false, orderNos: orders.map((o) => o.orderNo) };
    }

    const buyer = await this.loadBuyer(orders[0]!.userId);
    for (const o of orders) {
      if (o.status !== 'pending_payment') continue;
      const updated = await this.repo.updateStatus(o.id, 'paid', {
        paidAt: new Date(),
        ...(result.providerPaymentId ? { paymentRef: result.providerPaymentId } : {}),
      });
      const seller = await this.loadSeller(o.sellerId);
      if (updated) {
        // Bildirim
        await this.triggers.orderPaid(
          {
            id: updated.id,
            orderNo: updated.orderNo,
            totalCents: updated.totalCents,
            shippingAddressSnapshot: updated.shippingAddressSnapshot as {
              recipientName?: string;
            },
          },
          buyer,
          seller,
        );
        // e-Arşiv (async, hata durumunda log)
        const items = await this.repo.listItems(o.id);
        this.invoicing
          .issueForOrder({
            orderId: o.id,
            orderNo: o.orderNo,
            userId: o.userId,
            sellerId: o.sellerId,
            customer: {
              name:
                (updated.shippingAddressSnapshot as { recipientName?: string })?.recipientName ??
                buyer.name ??
                'Müşteri',
              email: buyer.email,
            },
            items: items.map((it) => ({
              name: it.productNameSnapshot,
              quantity: Number(it.quantity),
              unitPriceCents: it.unitPriceCents,
              kdvRate: Number(it.kdvRate),
            })),
            sellerLegalName: seller.displayName,
            grossCents: updated.totalCents,
            netCents: updated.totalCents - updated.kdvCents,
            kdvCents: updated.kdvCents,
          })
          .catch((err) => logger.warn({ err: String(err) }, 'invoicing failed'));
      }
    }

    return { success: true, orderNos: orders.map((o) => o.orderNo) };
  }

  async findForUser(userId: string, idOrNo: string) {
    let order = await this.repo.findByIdForUser(userId, idOrNo);
    if (!order) order = await this.repo.findByNoForUser(userId, idOrNo);
    if (!order) throw new NotFoundError('Order', idOrNo);
    const items = await this.repo.listItems(order.id);
    return { order, items };
  }

  async findForSeller(sellerId: string, id: string) {
    const order = await this.repo.findByIdForSeller(sellerId, id);
    if (!order) throw new NotFoundError('Order', id);
    const items = await this.repo.listItems(order.id);
    return { order, items };
  }

  listForUser(userId: string, page?: number, limit?: number) {
    return this.repo.listByUser(userId, page, limit);
  }

  listForSeller(sellerId: string, page?: number, limit?: number, status?: string) {
    return this.repo.listBySeller(sellerId, page, limit, status);
  }

  async sellerTransition(
    sellerId: string,
    orderId: string,
    target: OrderRow['status'],
    extra: { trackingNo?: string; cargoMode?: string; cancelReason?: string } = {},
  ) {
    const order = await this.repo.findByIdForSeller(sellerId, orderId);
    if (!order) throw new NotFoundError('Order', orderId);
    if (order.sellerId !== sellerId) throw new ForbiddenError();
    const allowed = TRANSITIONS[order.status];
    if (!allowed.includes(target)) {
      throw new BusinessRuleError(`Geçersiz durum geçişi: ${order.status} → ${target}`);
    }
    const patch: Record<string, unknown> = {};
    if (target === 'shipped') {
      if (!extra.trackingNo) throw new BusinessRuleError('Kargo takip numarası zorunlu');
      patch.trackingNo = extra.trackingNo;
      patch.cargoMode = extra.cargoMode ?? 'self_managed';
      patch.shippedAt = new Date();
    }
    if (target === 'delivered') patch.deliveredAt = new Date();
    if (target === 'completed') patch.completedAt = new Date();
    if (target === 'cancelled') {
      patch.cancelledAt = new Date();
      if (extra.cancelReason) patch.cancelReason = extra.cancelReason;
    }
    const updated = await this.repo.updateStatus(orderId, target, patch);

    // Bildirim tetikleyiciler
    if (updated) {
      const buyer = await this.loadBuyer(updated.userId);
      const seller = await this.loadSeller(updated.sellerId);
      const notifyOrder = {
        id: updated.id,
        orderNo: updated.orderNo,
        totalCents: updated.totalCents,
        cargoMode: updated.cargoMode ?? undefined,
        trackingNo: updated.trackingNo,
        cancelReason: updated.cancelReason,
      };
      try {
        if (target === 'confirmed') await this.triggers.orderConfirmed(notifyOrder, buyer);
        if (target === 'shipped') await this.triggers.orderShipped(notifyOrder, buyer);
        if (target === 'delivered') {
          await this.triggers.orderDelivered(notifyOrder, buyer);
          // Faz 6.2 — review.request bildirimi
          const items = await this.repo.listItems(updated.id);
          const productNames = items.map((i) => i.productNameSnapshot).slice(0, 5);
          await this.triggers
            .reviewRequest(buyer, updated.orderNo, productNames)
            .catch(() => undefined);
        }
        if (target === 'completed') {
          await this.triggers.orderCompleted(notifyOrder, buyer);
          await this.onOrderCompleted({
            id: updated.id,
            userId: updated.userId,
            totalCents: updated.totalCents,
            orderNo: updated.orderNo,
          });
        }
        if (target === 'cancelled') {
          await this.triggers.orderCancelled(notifyOrder, buyer, seller);
          await this.onOrderRefunded(updated.id);
        }
        if (target === 'refunded') {
          await this.onOrderRefunded(updated.id);
        }
      } catch (err) {
        logger.warn({ err: String(err) }, 'notification dispatch failed');
      }
    }
    return updated;
  }

  async customerConfirmDelivery(userId: string, orderId: string) {
    const order = await this.repo.findByIdForUser(userId, orderId);
    if (!order) throw new NotFoundError('Order', orderId);
    if (order.status !== 'delivered') {
      throw new BusinessRuleError('Sadece teslim edilen siparişler onaylanabilir');
    }
    const updated = await this.repo.updateStatus(orderId, 'completed', {
      completedAt: new Date(),
    });
    if (updated) {
      const buyer = await this.loadBuyer(userId);
      await this.triggers
        .orderCompleted(
          {
            id: updated.id,
            orderNo: updated.orderNo,
            totalCents: updated.totalCents,
          },
          buyer,
        )
        .catch(() => undefined);
      await this.onOrderCompleted({
        id: updated.id,
        userId: updated.userId,
        totalCents: updated.totalCents,
        orderNo: updated.orderNo,
      });
    }
    return updated;
  }

  /**
   * Cron job: delivered + 14g geçen siparişleri completed yap (escrow release).
   */
  async releaseEscrowDue(): Promise<{ released: number }> {
    const due = await this.repo.findDeliveredOlderThanDays(14);
    let released = 0;
    for (const o of due) {
      const updated = await this.repo.updateStatus(o.id, 'completed', {
        completedAt: new Date(),
      });
      if (updated) {
        released++;
        // Bildirim
        const buyer = await this.loadBuyer(updated.userId);
        await this.triggers
          .orderCompleted(
            {
              id: updated.id,
              orderNo: updated.orderNo,
              totalCents: updated.totalCents,
            },
            buyer,
          )
          .catch(() => undefined);
        await this.onOrderCompleted({
          id: updated.id,
          userId: updated.userId,
          totalCents: updated.totalCents,
          orderNo: updated.orderNo,
        });
      }
    }
    return { released };
  }

  private async loadBuyer(userId: string) {
    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        firstName: users.firstName,
        lastName: users.lastName,
        authUserId: users.authUserId,
        authEmail: authUser.email,
      })
      .from(users)
      .leftJoin(authUser, eq(authUser.id, users.authUserId))
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    const u = rows[0];
    if (!u) throw new NotFoundError('User', userId);
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return {
      userId: u.id,
      email: u.email ?? u.authEmail ?? '',
      phone: u.phone ?? undefined,
      name: name || undefined,
    };
  }

  private async loadSeller(sellerId: string) {
    const rows = await this.db
      .select({
        sellerId: sellers.id,
        displayName: sellers.displayName,
        contactEmail: sellers.contactEmail,
        contactPhone: sellers.contactPhone,
      })
      .from(sellers)
      .where(eq(sellers.id, sellerId))
      .limit(1);
    const s = rows[0];
    if (!s) throw new NotFoundError('Seller', sellerId);
    return s;
  }
}

/**
 * Sepet item'larını seller_id bazında gruplar + her grup için alt-totals hesaplar.
 */
function groupBySeller(cart: HydratedCart) {
  type Group = {
    items: HydratedCart['items'];
    totals: {
      subtotalCents: number;
      discountCents: number;
      kdvCents: number;
      totalCents: number;
    };
  };
  const map = new Map<string, Group>();
  for (const item of cart.items) {
    const sellerId = item.product.seller.id;
    const grp = map.get(sellerId) ?? {
      items: [],
      totals: { subtotalCents: 0, discountCents: 0, kdvCents: 0, totalCents: 0 },
    };
    grp.items.push(item);
    const ls = cart.totals.lineSummaries.find((l) => l.itemId === item.id);
    if (ls) {
      grp.totals.subtotalCents += ls.unitPriceCents * ls.quantity;
      grp.totals.discountCents += ls.discountCents;
      grp.totals.totalCents += ls.lineTotalCents;
    }
    map.set(sellerId, grp);
  }
  // Subtotal'i lineSummaries unitPrice × qty üzerinden yeniden hesapla (KDV ayrı tutmak için cart.totals'ı baz al)
  // KDV oranı item bazında farklı olabilir — Faz 3.2 simplification: tüm grup için 0 KDV ayrı
  for (const grp of map.values()) {
    grp.totals.kdvCents = 0;
    // subtotal = sum of unit*qty
    grp.totals.subtotalCents = grp.items.reduce((acc, it) => {
      const ls = cart.totals.lineSummaries.find((l) => l.itemId === it.id);
      return acc + (ls ? ls.unitPriceCents * ls.quantity : 0);
    }, 0);
  }
  return map;
}
