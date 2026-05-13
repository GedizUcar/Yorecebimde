import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

export type FunctionName =
  | 'searchProducts'
  | 'getProductDetail'
  | 'getCart'
  | 'addToCart'
  | 'placeOrder';

export type FunctionCall = {
  name: FunctionName;
  args: Record<string, unknown>;
};

/**
 * Gemini tool definitions. Her function için input schema +
 * doğal dil description (model bu description'a bakarak ne zaman çağıracağını seçer).
 */
export const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'searchProducts',
    description:
      'Yöresel ürün arar. Kullanıcı bir ürün (örn. "zeytinyağı", "Ezine peyniri") veya kategori (örn. "süt ürünleri") sorduğunda kullan. En fazla 10 sonuç döner.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: 'Arama sorgusu (Türkçe).',
        },
        minPrice: {
          type: SchemaType.NUMBER,
          description: 'Minimum birim fiyat (TL), opsiyonel.',
        },
        maxPrice: {
          type: SchemaType.NUMBER,
          description: 'Maksimum birim fiyat (TL), opsiyonel.',
        },
        onlyDiscounted: {
          type: SchemaType.BOOLEAN,
          description: 'Sadece indirimli ürünler.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'getProductDetail',
    description:
      'Bir ürünün detayı: stok, varyasyonlar, açıklama, satıcı bilgisi. Kullanıcı belirli bir ürün hakkında sorduğunda kullan. productId searchProducts sonucundan alınır.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        productId: {
          type: SchemaType.STRING,
          description: 'Ürün UUID.',
        },
      },
      required: ['productId'],
    },
  },
  {
    name: 'getCart',
    description: 'Kullanıcının mevcut sepetini getirir.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'addToCart',
    description:
      'Bir ürünü sepete ekler. quantity ürünün biriminde (kg, adet, vs.). Sepete eklenince doğal dilde onay ver.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        productId: {
          type: SchemaType.STRING,
          description: 'Ürün UUID.',
        },
        quantity: {
          type: SchemaType.NUMBER,
          description: 'Eklenecek miktar (ürün biriminde).',
        },
        variationId: {
          type: SchemaType.STRING,
          description: 'Varyasyon UUID (varsa), opsiyonel.',
        },
      },
      required: ['productId', 'quantity'],
    },
  },
  {
    name: 'placeOrder',
    description:
      'Sepetteki ürünlerle sipariş başlatır. Misafir kullanıcı çağırırsa LOGIN_REQUIRED hatası döner — kullanıcıya giriş yapmasını söyle. Adres seçilmemişse address-id\'siz çağır, hata gelirse kullanıcıya adres eklemesi gerektiğini söyle.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        shippingAddressId: {
          type: SchemaType.STRING,
          description: 'Teslimat adres UUID (kullanıcının default adresi).',
        },
        note: {
          type: SchemaType.STRING,
          description: 'Sipariş notu (opsiyonel).',
        },
      },
      required: ['shippingAddressId'],
    },
  },
];
