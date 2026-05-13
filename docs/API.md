# API — Yörecebimde

> NestJS REST + WebSocket endpoint listesi, request/response sözleşmeleri, auth & rate limit kuralları.

---

## 1. Genel Kurallar

### 1.1. Base URL

- **Production:** `https://api.yorecebimde.com`
- **Staging:** `https://api.staging.gkteches.com`
- **Local:** `http://localhost:4000`

### 1.2. Versionlama

- URL prefix: `/v1/...`
- Backward-incompatible değişiklik → `/v2/...` (paralel çalışır)

### 1.3. Auth

| Kanal | Mekanizma |
|---|---|
| Web (browser) | Better-Auth session cookie (`yorecebimde_session`) |
| Mobile (Expo) | JWT access (15dk) + refresh (30g) |
| Bot internal | Service token (HMAC-signed) |
| Public read | Anonim (rate-limited) |

Request header'ları:
- `Authorization: Bearer <jwt>` (mobile)
- `Cookie: yorecebimde_session=<...>` (web)
- `X-Request-Id: <uuid>` (her request, log korelasyonu için)
- `Accept-Language: tr` veya `en`

### 1.4. Response Formatı

**Başarılı:**
```json
{
  "data": { ... } | [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "hasMore": true
  }
}
```

**Hata:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Geçersiz veri",
    "details": [
      { "field": "email", "message": "Geçerli bir e-posta giriniz" }
    ],
    "requestId": "01HX..."
  }
}
```

### 1.5. HTTP Status Kodları

| Kod | Anlam |
|---|---|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Validation/business error |
| 401 | Unauthenticated |
| 403 | Forbidden (auth var ama yetki yok) |
| 404 | Not found |
| 409 | Conflict (örn. duplicate, stok yetersiz) |
| 422 | Unprocessable (business rule) |
| 429 | Rate limit |
| 500 | Internal server error |
| 503 | Service unavailable |

### 1.6. Rate Limit

| Endpoint grubu | Limit |
|---|---|
| Public read (`GET /v1/products`, etc.) | 120 req/dk/IP |
| Auth endpoints (`/auth/*`) | 10 req/dk/IP |
| Customer authenticated | 300 req/dk/user |
| Seller authenticated | 600 req/dk/user |
| Admin authenticated | 1200 req/dk/user |
| AI bot (`/bot/chat`) | 60 req/saat/user |
| Upload endpoints | 30 req/dk/user |

Response header: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

### 1.7. Pagination

Query params:
- `page` (1-based) veya `cursor` (UUID-based)
- `limit` (default 20, max 100)
- `sort` (`field:asc` veya `field:desc`)

Cursor öncelikli (büyük datasette daha güvenli).

---

## 2. Auth Endpoints

### Customer/User

| Method | Path | Açıklama |
|---|---|---|
| `POST` | `/v1/auth/register` | Email + telefon + şifre ile kayıt (SMS OTP) |
| `POST` | `/v1/auth/verify-otp` | OTP doğrulama |
| `POST` | `/v1/auth/login` | Email + şifre login |
| `POST` | `/v1/auth/login/oauth/:provider` | Google, Apple OAuth |
| `POST` | `/v1/auth/logout` | Session sonlandır |
| `POST` | `/v1/auth/refresh` | Refresh token ile access token yenile |
| `POST` | `/v1/auth/forgot-password` | Şifre sıfırlama maili |
| `POST` | `/v1/auth/reset-password` | Token + yeni şifre |
| `POST` | `/v1/auth/2fa/setup` | TOTP secret üret |
| `POST` | `/v1/auth/2fa/verify` | TOTP kod doğrula |
| `POST` | `/v1/auth/2fa/disable` | 2FA kapat |
| `GET` | `/v1/auth/me` | Şu anki kullanıcı bilgisi |

### Örnek: Kayıt

**Request:**
```http
POST /v1/auth/register
Content-Type: application/json

{
  "email": "ayse@example.com",
  "password": "Str0ng!Pass",
  "phone": "+905551234567",
  "firstName": "Ayşe",
  "lastName": "Yılmaz",
  "kvkkAccepted": true,
  "marketingOptIn": false,
  "locale": "tr"
}
```

**Response:**
```json
{
  "data": {
    "userId": "01HX...",
    "otpSent": true,
    "otpChannel": "sms",
    "otpExpiresAt": "2026-05-12T10:15:00Z"
  }
}
```

---

## 3. Sellers Endpoints

### Public + Seller-Owner

| Method | Path | Auth | Açıklama |
|---|---|---|---|
| `POST` | `/v1/sellers/applications` | public | Başvuru oluştur |
| `GET` | `/v1/sellers/applications/:id` | applicant | Başvuru durumu |
| `POST` | `/v1/sellers/applications/:id/documents` | applicant | Belge yükle |
| `POST` | `/v1/sellers/invites/redeem` | public | Davet linki ile hesap aktive |
| `GET` | `/v1/sellers/me` | seller | Kendi seller bilgisi |
| `PATCH` | `/v1/sellers/me` | seller | Mağaza bilgilerini güncelle |
| `GET` | `/v1/sellers/me/dashboard` | seller | Dashboard agregasyon |
| `GET` | `/v1/sellers/me/sales` | seller | Geçmiş satışlar (filter, export) |
| `GET` | `/v1/sellers/me/payouts` | seller | Payout geçmişi |
| `GET` | `/v1/sellers/me/balance` | seller | Bekleyen + ödenen bakiye |

### Public (Müşteri)

| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/v1/sellers/:slug` | Mağaza vitrin sayfası |
| `GET` | `/v1/sellers/:slug/products` | Mağaza ürünleri |
| `GET` | `/v1/sellers/:slug/reviews` | Mağaza yorumları |

### Admin

| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/v1/admin/sellers/applications` | Tüm başvurular (filter) |
| `POST` | `/v1/admin/sellers/applications/:id/approve` | Onayla → davet gönder |
| `POST` | `/v1/admin/sellers/applications/:id/reject` | Reddet |
| `POST` | `/v1/admin/sellers/applications/:id/request-info` | Ek belge iste |
| `GET` | `/v1/admin/sellers` | Tüm satıcılar |
| `POST` | `/v1/admin/sellers/:id/suspend` | Askıya al |
| `POST` | `/v1/admin/sellers/:id/reinstate` | Tekrar aktif |
| `POST` | `/v1/admin/sellers/:id/close` | Kapat |

---

## 4. Categories Endpoints

### Public

| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/v1/categories` | Kategori ağacı (full tree veya `?parent=` ile alt) |
| `GET` | `/v1/categories/:slug` | Detay |
| `GET` | `/v1/categories/:slug/products` | Bu kategorinin ürünleri (pagination, filter) |

### Seller

| Method | Path | Açıklama |
|---|---|---|
| `POST` | `/v1/category-requests` | Eksik kategori talebi |
| `GET` | `/v1/category-requests/mine` | Kendi talepleri |

### Admin

| Method | Path | Açıklama |
|---|---|---|
| `POST` | `/v1/admin/categories` | Yeni kategori |
| `PATCH` | `/v1/admin/categories/:id` | Düzenle |
| `DELETE` | `/v1/admin/categories/:id` | Sil (soft) |
| `GET` | `/v1/admin/category-requests` | Talepleri listele |
| `POST` | `/v1/admin/category-requests/:id/approve` | Talebi yeni kategori olarak ekle |
| `POST` | `/v1/admin/category-requests/:id/merge` | Mevcut kategoriye birleştir |
| `POST` | `/v1/admin/category-requests/:id/reject` | Reddet |

---

## 5. Products Endpoints

### Public

| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/v1/products` | Listeleme (kategori, fiyat, satıcı, varyasyon filter) |
| `GET` | `/v1/products/:slug` | Detay |
| `GET` | `/v1/products/:slug/reviews` | Yorumlar |
| `GET` | `/v1/products/:slug/questions` | Public Q&A |
| `POST` | `/v1/products/:slug/questions` | Soru sor (auth) |
| `GET` | `/v1/products/search` | Meilisearch query proxy |
| `GET` | `/v1/products/autocomplete` | Arama önerileri |
| `POST` | `/v1/products/:slug/view` | View count (debounced, idempotent) |

### Seller

| Method | Path | Açıklama |
|---|---|---|
| `POST` | `/v1/seller/products` | Yeni ürün |
| `GET` | `/v1/seller/products` | Kendi ürünleri |
| `PATCH` | `/v1/seller/products/:id` | Güncelle |
| `DELETE` | `/v1/seller/products/:id` | Sil (soft) |
| `POST` | `/v1/seller/products/:id/images` | Foto yükle (presigned URL via `/storage`) |
| `DELETE` | `/v1/seller/products/:id/images/:imgId` | Foto sil |
| `POST` | `/v1/seller/products/:id/variations` | Varyasyon ekle |
| `PATCH` | `/v1/seller/products/:id/variations/:varId` | Varyasyon güncelle |
| `DELETE` | `/v1/seller/products/:id/variations/:varId` | Varyasyon sil |
| `POST` | `/v1/seller/products/:id/discounts` | İndirim ekle |
| `PATCH` | `/v1/seller/products/:id/discounts/:disId` | İndirim güncelle |
| `DELETE` | `/v1/seller/products/:id/discounts/:disId` | İndirim sil |
| `PATCH` | `/v1/seller/products/:id/stock` | Stok manuel düzenle |
| `POST` | `/v1/seller/products/:id/mark-out-of-stock` | Stok bitti işaretle |
| `GET` | `/v1/seller/products/:id/stock-history` | Stok hareket geçmişi |
| `POST` | `/v1/seller/products/:id/questions/:qId/answer` | Soru cevapla |
| `POST` | `/v1/seller/products/:id/questions/:qId/publish` | Soru yayınla (public) |

### Admin

| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/v1/admin/products` | Tüm ürünler |
| `POST` | `/v1/admin/products/:id/hide` | Ürünü gizle |
| `POST` | `/v1/admin/products/:id/unhide` | Tekrar göster |

### Örnek: Ürün Listeleme

**Request:**
```http
GET /v1/products?category=peynir&minPrice=100&maxPrice=500&sort=price:asc&page=1&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "id": "01HX...",
      "slug": "ezine-beyaz-peynir-tam-yagli",
      "name": "Ezine Beyaz Peynir (Tam Yağlı)",
      "shortDescription": "Çanakkale Ezine'den günlük",
      "unit": "kg",
      "variationMode": "discrete",
      "variations": [
        { "id": "...", "label": "500g", "quantity": 0.5, "price": 175 },
        { "id": "...", "label": "1 kg", "quantity": 1, "price": 320 }
      ],
      "baseUnitPrice": 320,
      "discountedPrice": 280,
      "discount": { "type": "permanent", "percentage": 12.5 },
      "isColdChain": true,
      "rating": { "avg": 4.7, "count": 23 },
      "seller": { "id": "...", "slug": "ezine-ciftligi", "name": "Ezine Çiftliği" },
      "images": [
        { "url": "https://storage..../products/.../1.webp", "thumbnailUrl": "..." }
      ],
      "isSponsored": false
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 145, "hasMore": true }
}
```

---

## 6. Cart Endpoints

| Method | Path | Auth | Açıklama |
|---|---|---|---|
| `GET` | `/v1/cart` | guest+user | Sepeti getir (guest: deviceId query) |
| `POST` | `/v1/cart/items` | guest+user | Ürün ekle |
| `PATCH` | `/v1/cart/items/:id` | guest+user | Miktar değiştir |
| `DELETE` | `/v1/cart/items/:id` | guest+user | Sil |
| `POST` | `/v1/cart/merge` | user | Misafir sepetini birleştir (login sonrası) |
| `POST` | `/v1/cart/apply-coupon` | guest+user | Kupon uygula |
| `DELETE` | `/v1/cart/coupon` | guest+user | Kupon kaldır |
| `POST` | `/v1/cart/apply-loyalty` | user | Puan kullan |
| `POST` | `/v1/cart/clear` | guest+user | Sepeti boşalt |

---

## 7. Orders Endpoints

### Customer

| Method | Path | Açıklama |
|---|---|---|
| `POST` | `/v1/orders/checkout` | Sepetten sipariş oluştur, 3DS başlat |
| `GET` | `/v1/orders` | Kendi siparişlerim |
| `GET` | `/v1/orders/:id` | Detay |
| `GET` | `/v1/orders/:id/invoices` | Fatura PDF link'leri |
| `POST` | `/v1/orders/:id/groups/:gId/confirm-delivery` | Erken onay |
| `POST` | `/v1/orders/:id/groups/:gId/return-request` | İade aç |
| `POST` | `/v1/orders/:id/groups/:gId/cancel` | İptal (sadece pending/confirmed) |
| `GET` | `/v1/orders/:id/tracking` | Kargo takibi |

### Seller

| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/v1/seller/orders` | Satıcı siparişleri (filter, status) |
| `GET` | `/v1/seller/orders/:gId` | Detay |
| `POST` | `/v1/seller/orders/:gId/confirm` | Siparişi onayla (→ confirmed) |
| `POST` | `/v1/seller/orders/:gId/start-preparing` | Hazırlığa başla |
| `POST` | `/v1/seller/orders/:gId/ship` | Kargoya ver (tracking_no) |
| `POST` | `/v1/seller/orders/:gId/mark-delivered` | Teslim edildi (entegre kargoda otomatik) |
| `POST` | `/v1/seller/orders/:gId/cancel` | Satıcı iptali |
| `POST` | `/v1/seller/orders/:gId/print-label` | Kargo etiketi PDF (entegre kargo) |

### Admin

| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/v1/admin/orders` | Tüm siparişler |
| `GET` | `/v1/admin/orders/stats` | GMV, ciro, sipariş sayısı |
| `POST` | `/v1/admin/orders/:id/force-cancel` | Manuel iptal |

### Örnek: Checkout

**Request:**
```http
POST /v1/orders/checkout
Authorization: Bearer <jwt>

{
  "shippingAddressId": "01HX...",
  "billingAddressId": "01HX...",
  "shippingMethodsBySeller": {
    "01HXseller1": { "mode": "self_managed" },
    "01HXseller2": { "mode": "integrated_aras" }
  },
  "couponCode": "WELCOME10",
  "loyaltyPointsToUse": 0,
  "paymentMethod": "iyzico_3ds",
  "savedCardToken": null,
  "newCard": {
    "holderName": "Ayşe Yılmaz",
    "number": "5528790000000008",
    "expireMonth": "12",
    "expireYear": "2030",
    "cvc": "123",
    "saveForLater": false
  },
  "contractsAccepted": ["distance_sales", "preliminary_info"]
}
```

**Response (3DS pending):**
```json
{
  "data": {
    "orderId": "01HX...",
    "orderNo": "YC-2026-0000123",
    "status": "pending_3ds",
    "threeDsHtml": "<form action='...'>...</form>",
    "threeDsExpiresAt": "2026-05-12T10:30:00Z"
  }
}
```

---

## 8. Payment Webhooks

| Method | Path | Açıklama |
|---|---|---|
| `POST` | `/v1/webhooks/iyzico/callback` | Iyzico 3DS callback |
| `POST` | `/v1/webhooks/iyzico/refund` | Refund webhook |

Imza doğrulama HMAC ile.

---

## 9. Disputes Endpoints

### Customer

| Method | Path | Açıklama |
|---|---|---|
| `POST` | `/v1/disputes/:id/evidence` | Ek delil yükle |
| `GET` | `/v1/disputes` | Kendi disputeları |
| `GET` | `/v1/disputes/:id` | Detay |

### Seller

| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/v1/seller/disputes` | Listele |
| `POST` | `/v1/seller/disputes/:id/respond` | Cevap ver (kabul/red + delil) |

### Admin

| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/v1/admin/disputes` | Listele |
| `POST` | `/v1/admin/disputes/:id/resolve` | Karar ver (winner: customer/seller, refund amount) |

---

## 10. Chat (REST + WebSocket)

### REST

| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/v1/chat/threads` | Kendi thread listesi |
| `GET` | `/v1/chat/threads/:id` | Detay |
| `GET` | `/v1/chat/threads/:id/messages` | Geçmiş mesajlar |
| `POST` | `/v1/chat/threads/:id/messages` | Mesaj gönder |
| `POST` | `/v1/chat/threads/order/:orderGroupId` | Sipariş-bazlı thread aç |
| `POST` | `/v1/chat/threads/direct/:sellerId` | Direkt thread |
| `POST` | `/v1/chat/threads/support` | Müşteri destek thread |
| `POST` | `/v1/chat/threads/:id/read` | Okundu işaretle |

### WebSocket

**Connect:**
```
wss://ws.yorecebimde.com/?token=<jwt>
```

**Subscribe:**
```json
{ "op": "subscribe", "channel": "chat:thread:01HX..." }
```

**Message event:**
```json
{
  "op": "message",
  "channel": "chat:thread:01HX...",
  "data": {
    "id": "01HX...",
    "threadId": "01HX...",
    "senderUserId": "01HX...",
    "senderRole": "seller",
    "body": "Merhaba",
    "createdAt": "2026-05-12T10:00:00Z"
  }
}
```

**Notification push:**
```json
{
  "op": "notification",
  "channel": "notifications:user:01HX...",
  "data": {
    "type": "order.confirmed",
    "title": "Siparişiniz onaylandı",
    "body": "YC-2026-0000123 nolu siparişiniz satıcı tarafından onaylandı.",
    "deepLink": "/orders/01HX..."
  }
}
```

---

## 11. Boost Endpoints

| Method | Path | Auth | Açıklama |
|---|---|---|---|
| `GET` | `/v1/boost/packages` | seller | Aktif paketler |
| `POST` | `/v1/boost/purchase` | seller | Satın al (product_id + package_id) |
| `GET` | `/v1/boost/mine` | seller | Aktif boost'larım |
| `POST` | `/v1/boost/:id/cancel` | seller | İptal (refund yok, kalan süre yanar) |
| `GET` | `/v1/admin/boost/packages` | admin | Yönet |
| `POST` | `/v1/admin/boost/packages` | admin | Yeni paket |

---

## 12. Loyalty & Referral

### Customer

| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/v1/loyalty/balance` | Bakiye |
| `GET` | `/v1/loyalty/transactions` | Geçmiş |
| `GET` | `/v1/referrals/code` | Kendi kodum |
| `POST` | `/v1/referrals/redeem` | Kayıt sırasında referral kodu |
| `GET` | `/v1/referrals/mine` | Kullanılan kodlarım |

---

## 13. Coupons

| Method | Path | Açıklama |
|---|---|---|
| `POST` | `/v1/coupons/validate` | Müşteri: kupon kontrolü (apply'dan önce) |
| `GET` | `/v1/admin/coupons` | Listele |
| `POST` | `/v1/admin/coupons` | Yeni |
| `PATCH` | `/v1/admin/coupons/:id` | Güncelle |
| `DELETE` | `/v1/admin/coupons/:id` | Sil |

---

## 14. Reviews

| Method | Path | Açıklama |
|---|---|---|
| `POST` | `/v1/orders/:id/items/:itemId/review` | Yorum bırak (verified purchase) |
| `GET` | `/v1/reviews/mine` | Kendi yorumlarım |
| `POST` | `/v1/seller/reviews/:id/reply` | Satıcı cevap |
| `POST` | `/v1/admin/reviews/:id/hide` | Admin gizle |

---

## 15. Wishlist

| Method | Path | Auth | Açıklama |
|---|---|---|---|
| `GET` | `/v1/wishlist` | guest+user | (Guest: deviceId) |
| `POST` | `/v1/wishlist` | guest+user | Ürün ekle |
| `DELETE` | `/v1/wishlist/:productId` | guest+user | Çıkar |
| `POST` | `/v1/wishlist/merge` | user | Login sonrası |

---

## 16. Addresses

| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/v1/addresses` | Kendi adreslerim |
| `POST` | `/v1/addresses` | Yeni |
| `PATCH` | `/v1/addresses/:id` | Düzenle |
| `DELETE` | `/v1/addresses/:id` | Sil |
| `POST` | `/v1/addresses/:id/set-default` | Default yap |

---

## 17. Storage (Presigned URL)

| Method | Path | Açıklama |
|---|---|---|
| `POST` | `/v1/storage/presigned-upload` | Upload için presigned URL |
| `POST` | `/v1/storage/presigned-download` | Private dosya için |

**Request:**
```json
{ "bucket": "products", "filename": "kayisi.jpg", "mimeType": "image/jpeg", "sizeBytes": 1234567 }
```

**Response:**
```json
{
  "data": {
    "uploadUrl": "https://storage.../products/01HX.../kayisi.jpg?X-Amz-...",
    "key": "01HX.../kayisi.jpg",
    "publicUrl": "https://storage.yorecebimde.com/products/01HX.../kayisi.jpg",
    "expiresInSec": 600
  }
}
```

---

## 18. AI Bot

| Method | Path | Auth | Açıklama |
|---|---|---|---|
| `POST` | `/v1/bot/chat` | optional | Doğal dil mesaj — Gemini'ye yönlendirir |
| `POST` | `/v1/bot/functions/searchProducts` | internal | Function call (Gemini → backend) |
| `POST` | `/v1/bot/functions/getProductDetail` | internal | |
| `POST` | `/v1/bot/functions/getCart` | internal | |
| `POST` | `/v1/bot/functions/addToCart` | internal | |
| `POST` | `/v1/bot/functions/removeFromCart` | internal | |
| `POST` | `/v1/bot/functions/updateCartItem` | internal | |
| `POST` | `/v1/bot/functions/getAddresses` | internal | |
| `POST` | `/v1/bot/functions/placeOrder` | internal | (auth zorunlu, misafir hata) |
| `POST` | `/v1/bot/functions/getOrderStatus` | internal | |
| `POST` | `/v1/bot/functions/contactSeller` | internal | |

Internal endpoint'ler **service token** ile imzalı (HMAC-SHA256) — sadece NestJS içinden çağrılır.

---

## 19. Notifications (Customer Settings)

| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/v1/notifications/preferences` | Kanal/event tercihleri |
| `PATCH` | `/v1/notifications/preferences` | Güncelle |
| `GET` | `/v1/notifications/inbox` | In-app bildirimler |
| `POST` | `/v1/notifications/:id/read` | Okundu |

---

## 20. Admin Other

| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/v1/admin/audit-logs` | Audit log query |
| `GET` | `/v1/admin/kvkk/requests` | KVKK talepleri |
| `POST` | `/v1/admin/kvkk/requests/:id/resolve` | İşle (silme/dışa aktarma) |
| `GET` | `/v1/admin/settings` | Sistem ayarları |
| `PATCH` | `/v1/admin/settings/:key` | Ayar güncelle |
| `GET` | `/v1/admin/notification-templates` | Şablonlar |
| `PATCH` | `/v1/admin/notification-templates/:id` | Şablon güncelle |
| `GET` | `/v1/admin/dashboard` | Üst düzey metrikler |

---

## 21. Health & Metrics

| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/healthz` | Liveness (basit) |
| `GET` | `/readyz` | Readiness (DB+Redis+Meilisearch ping) |
| `GET` | `/metrics` | Prometheus metrics (internal, IP whitelist) |

---

## 22. OpenAPI

NestJS Swagger ile OpenAPI 3.1 dökümanı otomatik üretilir:
- **Swagger UI:** `/v1/docs` (sadece dev + staging)
- **JSON spec:** `/v1/docs-json` (CI'da indirilir, frontend tip üretiminde kullanılır)

Mobile client SDK için `openapi-typescript` ile tip üretimi (CI step).
