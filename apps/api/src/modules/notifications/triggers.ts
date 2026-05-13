import { Injectable } from '@nestjs/common';
import { money } from '@yorecebimde/shared';
import { NotificationsService } from './notifications.service.js';

type OrderForNotify = {
  id: string;
  orderNo: string;
  totalCents: number;
  cargoMode?: string;
  trackingNo?: string | null;
  shippingAddressSnapshot?: { recipientName?: string };
  cancelReason?: string | null;
};

type CustomerInfo = {
  userId: string;
  email: string;
  phone?: string | null | undefined;
  name?: string | null | undefined;
};

type SellerInfo = {
  sellerId: string;
  displayName: string;
  contactEmail: string;
  contactPhone?: string | null | undefined;
};

function fmtTotal(cents: number): string {
  return money.format(BigInt(cents), 'tr');
}

/**
 * Trigger fonksiyonları — OrdersService transition'ları bu sınıfı çağırır.
 * Yeni tetikleyici eklerken `templates.ts`'e karşılığını da eklenmesi gerekir.
 */
@Injectable()
export class NotificationTriggers {
  constructor(private readonly notifications: NotificationsService) {}

  async orderPaid(order: OrderForNotify, buyer: CustomerInfo, seller: SellerInfo) {
    const recipientName = order.shippingAddressSnapshot?.recipientName ?? buyer.name ?? 'Müşterimiz';
    // Müşteri
    await this.notifications.send({
      trigger: 'order.paid',
      channels: ['email', 'sms'],
      recipient: {
        email: buyer.email,
        ...(buyer.phone ? { phone: buyer.phone } : {}),
        userId: buyer.userId,
      },
      data: {
        orderNo: order.orderNo,
        total: fmtTotal(order.totalCents),
        recipientName,
      },
    });

    // Satıcı
    await this.notifications.send({
      trigger: 'order.paid.seller',
      channels: ['email', 'sms'],
      recipient: {
        email: seller.contactEmail,
        ...(seller.contactPhone ? { phone: seller.contactPhone } : {}),
        sellerId: seller.sellerId,
      },
      data: {
        orderNo: order.orderNo,
        orderId: order.id,
        total: fmtTotal(order.totalCents),
        sellerName: seller.displayName,
        customerName: recipientName,
      },
    });
  }

  async orderConfirmed(order: OrderForNotify, buyer: CustomerInfo) {
    await this.notifications.send({
      trigger: 'order.confirmed',
      channels: ['email'],
      recipient: { email: buyer.email, userId: buyer.userId },
      data: { orderNo: order.orderNo },
    });
  }

  async orderShipped(order: OrderForNotify, buyer: CustomerInfo) {
    await this.notifications.send({
      trigger: 'order.shipped',
      channels: ['email', 'sms'],
      recipient: {
        email: buyer.email,
        ...(buyer.phone ? { phone: buyer.phone } : {}),
        userId: buyer.userId,
      },
      data: {
        orderNo: order.orderNo,
        cargoMode: order.cargoMode ?? '',
        trackingNo: order.trackingNo ?? '',
      },
    });
  }

  async orderDelivered(order: OrderForNotify, buyer: CustomerInfo) {
    await this.notifications.send({
      trigger: 'order.delivered',
      channels: ['email'],
      recipient: { email: buyer.email, userId: buyer.userId },
      data: { orderNo: order.orderNo },
    });
  }

  async orderCompleted(order: OrderForNotify, buyer: CustomerInfo) {
    await this.notifications.send({
      trigger: 'order.completed',
      channels: ['email'],
      recipient: { email: buyer.email, userId: buyer.userId },
      data: { orderNo: order.orderNo },
    });
  }

  async orderCancelled(order: OrderForNotify, buyer: CustomerInfo, seller: SellerInfo) {
    await this.notifications.send({
      trigger: 'order.cancelled',
      channels: ['email', 'sms'],
      recipient: {
        email: buyer.email,
        ...(buyer.phone ? { phone: buyer.phone } : {}),
        userId: buyer.userId,
      },
      data: {
        orderNo: order.orderNo,
        reason: order.cancelReason ?? 'Belirtilmedi',
      },
    });
    await this.notifications.send({
      trigger: 'order.cancelled.seller',
      channels: ['email'],
      recipient: { email: seller.contactEmail, sellerId: seller.sellerId },
      data: {
        orderNo: order.orderNo,
        reason: order.cancelReason ?? 'Belirtilmedi',
      },
    });
  }

  // ───── Faz 6 triggers ─────

  async loyaltyEarned(buyer: CustomerInfo, points: number, orderNo: string) {
    await this.notifications.send({
      trigger: 'loyalty.earned',
      channels: ['email'],
      recipient: { email: buyer.email, userId: buyer.userId },
      data: { points: String(points), orderNo },
    });
  }

  async referralCompleted(
    referrer: CustomerInfo,
    rewardPoints: number,
    refereeName: string,
  ) {
    await this.notifications.send({
      trigger: 'referral.completed',
      channels: ['email'],
      recipient: { email: referrer.email, userId: referrer.userId },
      data: { points: String(rewardPoints), refereeName },
    });
  }

  async reviewRequest(buyer: CustomerInfo, orderNo: string, productNames: string[]) {
    await this.notifications.send({
      trigger: 'review.request',
      channels: ['email'],
      recipient: { email: buyer.email, userId: buyer.userId },
      data: {
        orderNo,
        productList: productNames.join(', '),
      },
    });
  }
}
