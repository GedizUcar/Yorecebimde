/**
 * Bildirim şablonları — basit `{{var}}` interpolation.
 * Faz 4'te Handlebars + DB-stored templates + i18n locale switching.
 */

export type TriggerKey =
  | 'order.paid'
  | 'order.paid.seller'
  | 'order.confirmed'
  | 'order.shipped'
  | 'order.delivered'
  | 'order.completed'
  | 'order.cancelled'
  | 'order.cancelled.seller'
  | 'low_stock.seller'
  | 'loyalty.earned'
  | 'referral.completed'
  | 'review.request';

export type TemplateChannel = 'email' | 'sms' | 'push' | 'in_app';

export type Template = {
  subject?: string;
  body: string;
};

const TEMPLATES: Record<TriggerKey, Partial<Record<TemplateChannel, Template>>> = {
  'order.paid': {
    email: {
      subject: 'Siparişiniz alındı — {{orderNo}}',
      body:
        'Merhaba {{recipientName}},\n\n' +
        '{{orderNo}} numaralı siparişiniz alındı. Toplam tutar: {{total}}.\n' +
        'Siparişinizi şu adresten takip edebilirsiniz: {{baseUrl}}/hesabim/siparislerim/{{orderNo}}\n\n' +
        'Teşekkür ederiz,\nYörecebimde',
    },
    sms: {
      body: 'Yorecebimde: {{orderNo}} siparisiniz alindi, toplam {{total}}. Detay: {{baseUrl}}/hesabim/siparislerim/{{orderNo}}',
    },
  },
  'order.paid.seller': {
    email: {
      subject: '🛒 Yeni sipariş — {{orderNo}}',
      body:
        'Merhaba {{sellerName}},\n\n' +
        '{{orderNo}} numaralı yeni bir sipariş aldınız.\n' +
        'Tutar: {{total}}\n' +
        'Müşteri: {{customerName}}\n\n' +
        'Detay: {{baseUrl}}/seller/orders/{{orderId}}\n\n' +
        'Yörecebimde',
    },
    sms: {
      body: 'Yorecebimde: Yeni siparis {{orderNo}}, tutar {{total}}. Panel: {{baseUrl}}/seller/orders',
    },
  },
  'order.confirmed': {
    email: {
      subject: 'Siparişiniz onaylandı — {{orderNo}}',
      body:
        '{{orderNo}} numaralı siparişiniz satıcı tarafından onaylandı ve hazırlığa alınacak. ' +
        'Kargo aşamasında size tekrar haber vereceğiz.\n\nDetay: {{baseUrl}}/hesabim/siparislerim/{{orderNo}}',
    },
  },
  'order.shipped': {
    email: {
      subject: '📦 Siparişiniz kargoda — {{orderNo}}',
      body:
        '{{orderNo}} numaralı siparişiniz kargoya verildi.\n' +
        'Kargo: {{cargoMode}}, Takip No: {{trackingNo}}\n\n' +
        'Detay: {{baseUrl}}/hesabim/siparislerim/{{orderNo}}',
    },
    sms: {
      body: 'Yorecebimde: {{orderNo}} kargoda. Takip {{trackingNo}}.',
    },
  },
  'order.delivered': {
    email: {
      subject: 'Siparişiniz teslim edildi — {{orderNo}}',
      body:
        '{{orderNo}} numaralı siparişiniz teslim edildi. 14 gün içinde onaylamanız gerekiyor; ' +
        'aksi halde otomatik tamamlanacaktır.\n\nDetay: {{baseUrl}}/hesabim/siparislerim/{{orderNo}}',
    },
  },
  'order.completed': {
    email: {
      subject: 'Sipariş tamamlandı — {{orderNo}}',
      body:
        '{{orderNo}} numaralı siparişiniz tamamlandı. Yörecebimde\'yi tercih ettiğiniz için teşekkürler.',
    },
  },
  'order.cancelled': {
    email: {
      subject: 'Siparişiniz iptal edildi — {{orderNo}}',
      body:
        '{{orderNo}} numaralı siparişiniz iptal edildi.\nSebep: {{reason}}\n\n' +
        'Ödediğiniz tutar iade sürecine alındı.',
    },
  },
  'order.cancelled.seller': {
    email: {
      subject: 'Sipariş iptali — {{orderNo}}',
      body:
        '{{orderNo}} numaralı sipariş iptal edildi.\nSebep: {{reason}}',
    },
  },
  'low_stock.seller': {
    email: {
      subject: '⚠ Düşük stok — {{productName}}',
      body:
        '{{productName}} ürününüzde stok eşiğin altına düştü. Mevcut: {{stock}} {{unit}}.\n' +
        'Panel: {{baseUrl}}/seller/products/{{productId}}',
    },
  },
  'loyalty.earned': {
    email: {
      subject: '🎁 {{points}} puan kazandın',
      body:
        '{{orderNo}} numaralı siparişin için {{points}} puan kazandın. ' +
        'Puanlarını bir sonraki siparişinde kullanabilirsin.\n\n' +
        'Detay: {{baseUrl}}/hesabim/puanlarim',
    },
  },
  'referral.completed': {
    email: {
      subject: '🎉 Davet ödülünü kazandın',
      body:
        'Davet ettiğin {{refereeName}} ilk siparişini tamamladı! ' +
        'Hesabına {{points}} puan eklendi.\n\n' +
        'Detay: {{baseUrl}}/hesabim/davet',
    },
  },
  'review.request': {
    email: {
      subject: 'Siparişin hakkında yorum yapar mısın?',
      body:
        '{{orderNo}} numaralı siparişin teslim edildi. ' +
        'Aldığın ürünleri ({{productList}}) değerlendirir misin? ' +
        'Yorumların diğer alışveriş yapanlara büyük katkı sağlıyor.\n\n' +
        '{{baseUrl}}/hesabim/yorumlarim',
    },
  },
};

export function render(
  trigger: TriggerKey,
  channel: TemplateChannel,
  data: Record<string, string | number>,
): Template | null {
  const tpl = TEMPLATES[trigger]?.[channel];
  if (!tpl) return null;
  return {
    ...(tpl.subject ? { subject: interpolate(tpl.subject, data) } : {}),
    body: interpolate(tpl.body, data),
  };
}

function interpolate(template: string, data: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = data[key];
    return v !== undefined ? String(v) : `{{${key}}}`;
  });
}
