export const SUPPORTED_LOCALES = ['tr', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const USER_ROLES = ['customer', 'seller', 'admin', 'super_admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['active', 'suspended', 'deleted'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const SELLER_TYPES = ['individual', 'company'] as const;
export type SellerType = (typeof SELLER_TYPES)[number];

export const SELLER_STATUSES = ['pending', 'approved', 'suspended', 'rejected', 'closed'] as const;
export type SellerStatus = (typeof SELLER_STATUSES)[number];

export const MEASUREMENT_UNITS = ['kg', 'g', 'lt', 'ml', 'adet', 'paket', 'kasa', 'demet', 'tane'] as const;
export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];

export const VARIATION_MODES = ['none', 'discrete', 'stepper'] as const;
export type VariationMode = (typeof VARIATION_MODES)[number];

export const DISCOUNT_TYPES = ['permanent', 'time_based', 'quantity_based'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'return_requested',
  'returned',
  'refunded',
  'disputed',
  'resolved',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const SHIPPING_MODES = [
  'self_managed',
  'integrated_aras',
  'integrated_mng',
  'integrated_yurtici',
  'integrated_ptt',
] as const;
export type ShippingMode = (typeof SHIPPING_MODES)[number];

export const PAYMENT_STATUSES = [
  'initiated',
  'pending_3ds',
  'success',
  'failed',
  'refunded',
  'partial_refund',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ['email', 'sms', 'push', 'in_app'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

// Audit log actions
export const AUDIT_ACTIONS = [
  'auth.login',
  'auth.logout',
  'auth.2fa_enable',
  'auth.2fa_disable',
  'auth.password_changed',
  'seller.application_submitted',
  'seller.application_approved',
  'seller.application_rejected',
  'seller.suspended',
  'seller.reinstated',
  'seller.closed',
  'seller.iban_revealed',
  'seller.tc_revealed',
  'product.created',
  'product.updated',
  'product.deleted',
  'product.hidden_by_admin',
  'category.created',
  'category.updated',
  'category.deleted',
  'category_request.approved',
  'category_request.rejected',
  'order.created',
  'order.confirmed',
  'order.shipped',
  'order.delivered',
  'order.cancelled',
  'order.refunded',
  'dispute.opened',
  'dispute.resolved',
  'coupon.created',
  'coupon.used',
  'kvkk.request_resolved',
  'system.setting_changed',
  'notification_template.changed',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
