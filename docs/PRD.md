# PRD — Yörecebimde

> **Product Requirements Document**
> Versiyon: 0.1.0
> Tarih: 2026-05-12
> Sahip: Gediz
> Durum: Onaylı taslak — kod yazımına temel oluşturur

---

## 1. Vizyon

Yöresel ve niş gıda üreticilerinin (şahıs ve şirket) Türkiye genelinde son kullanıcıya doğrudan ulaşabildiği, **şeffaf**, **güvenli** ve **dijital olarak kolay yönetilebilen** bir pazaryeri. Kullanıcı için Trendyol/Hepsiburada deneyiminin gıdaya odaklanmış hali; satıcı için ürün/sipariş/stok/finansın tek panelden yönetilebildiği bir araç; bizim için ölçeklenebilir, multi-tenant ve yasalara uyumlu bir platform.

## 2. Hedef Kitle

### 2.1. Satıcı Personası
- **Üretici Köylü Ali** (45–60): Kayısı, peynir, zeytinyağı üreticisi; dijital okuryazarlık orta; SMS+telefon kullanır
- **Aile İşletmesi Ayşe Hanım** (30–45): Reçel, turşu, salça atölyesi; Instagram'da satıyor, daha geniş pazara çıkmak istiyor
- **Yerli Marka Mehmet Bey** (35–50): Kurutulmuş gıda, baharat şirketi; KOBİ; e-Fatura kesiyor; lojistik tecrübeli

### 2.2. Alıcı Personası
- **Şehirli Ayşe** (28–45): İstanbul/Ankara/İzmir; yöresel/organik gıdaya değer veriyor; mobile-first; KK öder
- **Anne/Baba Hasan** (40–55): Kaliteye önem veren, "memleketin gerçek tadı" arayan; web tercih ederse de mobil de kullanır
- **Hediyelik Arayan Ali** (25–40): Sevdiğine kutu yöresel hediye gönderen; teslimat hızı kritik

### 2.3. Süper Admin (Bizler)
- Platform operasyonu, başvuru onayı, finans, dispute yönetimi, içerik moderasyonu

## 3. Problem Tanımı

- Yöresel üreticiler Trendyol/Hepsiburada gibi büyük pazarlarda kaybolur, gıdaya özel filtreleme/sertifikasyon yok
- Mevcut yöresel siteler çoğunlukla statik vitrin, gerçek pazaryeri özellikleri (sepet, çoklu satıcı, escrow, dispute) yok
- Satıcının ürün/varyasyon/stok/fatura/lojistik bütünü için tek bir araç yok — birden fazla yerde takip ediyorlar
- Müşteri için "gerçek üreticiden mi alıyorum?" güveni eksik — biz onay süreciyle bunu sağlarız

## 4. Kapsam — Ne yapacağız, ne yapmayacağız

### 4.1. Yapacaklarımız (In Scope)

**Müşteri (Web + Mobil):**
- Anasayfa: kategoriler, öne çıkan ürünler, kampanyalar, sponsorlu ürünler (her 5'te 1)
- Kategori & arama: filtre (fiyat, kategori, satıcı, varyasyon, indirim, rating), sıralama, otomatik tamamlama
- Ürün detay: galeri (max 3 görsel), varyasyon seçimi, miktar, ürün açıklaması, satıcı bilgisi, Q&A, yorumlar
- Sepet: çoklu satıcı, satıcı bazında alt-toplam, kupon, kargo seçimi, kargo ücreti
- Checkout: adres seçimi/ekleme, ödeme (Iyzico — KK, BKM Express), sözleşme onayları
- Hesap: profil, adresler, siparişlerim, iadelerim, beğendiğim ürünler, kuponlarım, puanlarım
- Beğendiğim ürünler: misafir için localStorage deviceID, giriş yapınca otomatik taşıma + birleştirme
- Mağaza sayfası: `/magaza/<slug>` — satıcının vitrini, tüm ürünleri, hakkında, rating
- Müşteri ↔ satıcı chat (sipariş bazlı veya direkt)
- Müşteri ↔ super admin chat (destek)
- AI Bot (sağ alt köşede, Gemini): ürün arama, sepete ekleme, sepet görüntüleme, sipariş tamamlama (giriş yapmış için)
- Bildirim: email (Resend), SMS (NetGSM), push (Expo Push)
- Sadakat puanı + referral kod
- Kupon: super admin tarafından üretilen
- TR + EN dil desteği

**Satıcı Paneli:**
- Başvuru süreci: şahıs/şirket form, belge yükleme, KYC akışı
- Onay sonrası davet linki (mail+SMS)
- Dashboard: bugün/hafta/ay satış, pending sipariş, düşük stok, yeni mesaj
- Ürün yönetimi: CRUD, kategori seçimi (yok ise talep), varyasyon (discrete/stepper), birim, foto (max 3)
- Fiyat yönetimi: birim fiyat, KDV oranı, indirim (kalıcı/süreli/miktar-bazlı — hepsi opsiyon)
- Stok yönetimi: ekle/düzenle/bitti, otomatik düşme, düşük stok uyarısı (mail+SMS)
- Sipariş yönetimi: pending → confirmed → preparing → shipped → delivered; kargo etiketi (entegre veya manuel takip no)
- İade/Dispute: müşteri talepleri, delil yükleme, kabul/red
- Müşteri chat: sipariş bazında veya direkt
- Mağaza sayfası düzenleme: logo, kapak, hakkında, çalışma saatleri
- Boost satın alma: ürün öne çıkarma paketleri
- Finansal raporlar: ciro, komisyon, bekleyen ödemeler, payout geçmişi
- e-Arşiv fatura otomatik kesimi (Nilvera) — müşteriye
- 2FA zorunlu

**Süper Admin Paneli:**
- Dashboard: GMV, aktif satıcı sayısı, bekleyen başvuru, dispute, gelir
- Satıcı başvuru yönetimi: belge inceleme, onay/red, davet gönderimi
- Satıcı yönetimi: listeleme, askıya alma, kapatma, manuel düzenleme
- Kategori yönetimi: hiyerarşi (generic derinlik), talep yönetimi, KDV default
- Ürün moderasyonu (ileride): onay queue
- Dispute yönetimi: eskalasyonu üzerine karar verme
- Kupon yönetimi: oluştur/dağıt/limit
- Komisyon yönetimi: kategori bazlı oranlar
- Müşteri destek chat
- Audit log viewer
- Finansal raporlar: GMV, komisyon, Iyzico hareketleri
- Bildirim şablonu yönetimi (i18n)
- KVKK: veri silme talebi yönetimi
- Boost paketi yönetimi: paket türleri, fiyatları
- 2FA zorunlu

### 4.2. Yapmayacaklarımız (Out of Scope — Bu sürümde)

- Yurtdışı satış (TL only, TR adresler only)
- B2B (toptan) modu
- Subscription / abonelik bazlı sipariş (ileride)
- White-label satıcı domain'leri
- Etkinlik/canlı yayın satış
- Sosyal etkileşim (takip, beğen, paylaş) — wishlist hariç
- Influencer affiliate sistemi (ileride)
- WhatsApp Business entegrasyonu (Faz 7+ opsiyonel)
- Çoklu para birimi
- Çoklu warehouse / fulfillment center

## 5. Kullanıcı Hikayeleri (User Stories)

### 5.1. Müşteri

- **US-C-01** — Misafir kullanıcı olarak anasayfayı ziyaret edebilir, ürünleri arayabilirim.
- **US-C-02** — Misafir kullanıcı olarak sepete ürün ekleyebilirim; giriş yapınca sepetim taşınsın (mevcut sepetimle birleşsin).
- **US-C-03** — Misafir kullanıcı olarak ürünleri beğenebilirim; tarayıcımda kalıcı olsun (deviceID).
- **US-C-04** — Telefon numaramı doğrulayarak hesap açabilirim (SMS OTP).
- **US-C-05** — Birden fazla teslimat adresi kaydedebilirim, sipariş sırasında seçebilirim.
- **US-C-06** — Sepetimde farklı satıcıların ürünleri olabilir; siparişim satıcı bazında bölünür.
- **US-C-07** — Kargo seçeneği ve ücretini görerek checkout yapabilirim.
- **US-C-08** — Ödeme yaparken kartımı kaydedebilirim (Iyzico güvenli kart saklama).
- **US-C-09** — Siparişimin durumunu takip edebilirim, her aşamada bildirim alırım.
- **US-C-10** — Teslimattan 14 gün içinde iade açabilirim.
- **US-C-11** — Satıcıyla sipariş üzerinden chat yapabilirim.
- **US-C-12** — AI bot ile ürün arayıp doğrudan sepete ekleyip sipariş tamamlayabilirim (giriş yapmışsam).
- **US-C-13** — Ürün satın aldıktan sonra yorum + puan bırakabilirim.
- **US-C-14** — Ürün hakkında satıcıya soru sorabilirim; satıcı yayınla derse herkese görünür.
- **US-C-15** — Sadakat puanı biriktirebilir, sonraki alışverişte kullanabilirim.
- **US-C-16** — Referral kodumu paylaşıp, kullanan arkadaşımdan sonra puan kazanabilirim.

### 5.2. Satıcı

- **US-S-01** — Bir başvuru formu doldurarak Yörecebimde'ye başvuru yapabilirim.
- **US-S-02** — Başvurum onaylanınca email+SMS ile davet linki alırım, hesabımı aktive ederim.
- **US-S-03** — İlk girişte 2FA kurmaya zorlanırım.
- **US-S-04** — Kategori seçerek ürün ekleyebilirim; istediğim kategori yoksa talep gönderebilirim.
- **US-S-05** — Ürünüm için discrete (sabit seçenekler) veya stepper (artırmalı) varyasyon tanımlayabilirim.
- **US-S-06** — Birim fiyatımı (₺/kg, ₺/adet, vs.) girerim, sistem toplam fiyatı hesaplar.
- **US-S-07** — Ürünüme kalıcı, süreli veya miktar bazlı indirim koyabilirim (üçü aynı anda olabilir).
- **US-S-08** — Stok girerim; sipariş geldikçe otomatik düşer, manuel düzenleyebilirim.
- **US-S-09** — Düşük stok eşiği belirler, altına düşünce mail+SMS alırım.
- **US-S-10** — Yeni siparişlerimi dashboardumda anlık görür, mail+SMS+push bildirimi alırım.
- **US-S-11** — Siparişi onaylar, hazırlık → kargo → teslimat süreçlerini güncellerim.
- **US-S-12** — Kargoyu kendim anlaşıp manuel takip no girebilir veya entegre kargo seçeneklerinden birini kullanabilirim.
- **US-S-13** — Müşteri sorusu/iade talebi geldiğinde panelimden cevap veririm.
- **US-S-14** — Geçmiş satışlarımı detayla görür, filtreler ve dışa aktarabilirim.
- **US-S-15** — Ürünümü öne çıkarmak için boost paketi satın alabilirim.
- **US-S-16** — Müşteriye otomatik e-Arşiv faturası kesilir (Nilvera).
- **US-S-17** — Komisyon kesintilerini, payout takvimini ve bakiyemi görürüm.
- **US-S-18** — Mağaza vitrinimi (logo, kapak, açıklama) düzenleyebilirim.

### 5.3. Süper Admin

- **US-A-01** — Tüm bekleyen başvuruları görüp inceleyip onay/red kararı verebilirim.
- **US-A-02** — Onaylanan satıcıya otomatik davet linki gönderilir.
- **US-A-03** — Tüm satıcıları ve ürünleri tek panelde yönetebilirim.
- **US-A-04** — Kategori talebi geldiğinde kabul/red edebilirim.
- **US-A-05** — Eskalasyon olan dispute'lara karar verebilirim.
- **US-A-06** — Kupon oluşturup limitli/limitsiz dağıtabilirim.
- **US-A-07** — Komisyon oranlarını kategori bazlı belirleyebilirim.
- **US-A-08** — Tüm finansal raporları görebilirim (GMV, komisyon, payout).
- **US-A-09** — Müşteri destek chatlerini cevaplayabilirim.
- **US-A-10** — Tüm admin aksiyonları audit log'da görürüm.
- **US-A-11** — KVKK veri silme taleplerini işleyebilirim.

## 6. Detaylı Özellikler

### 6.1. Kategori Sistemi

- Hiyerarşik, **generic derinlik** (1 seviye de olur, 6 seviye de) — `parent_id` self-reference
- Bir ürün birden fazla kategoriye atanabilir
- Her kategori için **default KDV oranı** — satıcı override edebilir
- Kategori talep akışı: satıcı önerir → super admin onaylar veya birleştirir
- Slug + i18n isim (TR/EN)
- Icon + cover image opsiyonel

### 6.2. Ürün ve Varyasyon

**Ürün alanları:**
- name (i18n), description (i18n), short_description (i18n)
- slug
- seller_id
- categories[] (M2M)
- unit (kg/g/lt/ml/adet/paket/...)
- variation_mode: `none` | `discrete` | `stepper`
- variation_options[] (discrete için): `[{ label: "1kg", quantity: 1, price_override: null }]`
- stepper_config (stepper için): `{ min: 0.5, max: 10, step: 0.5 }`
- base_unit_price (₺)
- kdv_rate (0/1/8/10/20)
- kdv_included (boolean)
- images[] (max 3, WebP)
- is_cold_chain (boolean)
- is_active (boolean)
- stock_quantity
- low_stock_threshold
- low_stock_notify (boolean)
- weight (kargo hesabı için)
- created_at, updated_at, deleted_at

**İndirim:**
```ts
type Discount = {
  type: 'permanent' | 'time_based' | 'quantity_based'
  permanent?: { percentage: number }
  time_based?: { percentage: number; start_at: Date; end_at: Date }
  quantity_based?: { tiers: { min_quantity: number; percentage: number }[] }
}
```

Birden fazla indirim aktif olabilir; **en yüksek olan uygulanır** (kullanıcı lehine).

### 6.3. Sepet

- **Misafir**: localStorage'da deviceID UUID + items
- **Giriş yapmış**: DB'de `carts` tablosu, user_id'ye bağlı
- **Login geçişi**: misafir cart items → user cart'a **birleştirme** (mevcut item'ı bulursa quantity'leri toplar)
- **Stok rezervasyonu**: checkout başlatılınca 15 dk rezervasyon (Redis TTL key)
- **Multi-seller**: tek sepette farklı satıcıların ürünleri olabilir, satıcı bazında alt toplam gösterilir
- **Kargo**: satıcı başına ayrı seçim

### 6.4. Sipariş

- Bir checkout → `order_groups` (satıcı sayısı kadar)
- Her `order_group` ayrı state machine'i izler
- State: `pending → confirmed → preparing → shipped → delivered → completed` (+ `cancelled`, `return_requested`, `returned`, `refunded`, `disputed`, `resolved`)
- `pending` → ödeme alındı, satıcı onayını bekliyor
- `confirmed` → satıcı manuel onayladı
- `delivered` + 14 gün → otomatik `completed` (escrow release)
- Veya kullanıcı manuel "Siparişi onayla" → erken `completed`

### 6.5. Ödeme (Iyzico Sub-Merchant Marketplace)

**Akış:**
1. Satıcı onboard olurken Iyzico'da sub-merchant olarak oluşturulur (IBAN'ı ile)
2. Müşteri öder → Iyzico paranın tamamını alır, **escrow havuzunda** tutar
3. Order group `completed` olunca:
   - Komisyon kesinti hesaplanır (kategori bazlı)
   - Kalan satıcı sub-merchant'a release edilir
   - Komisyon main account'a alınır
4. Refund: Iyzico refund API ile escrow'dan iade

**KDV:**
- Satıcı kendi KDV'sini öder (e-Arşiv fatura ile)
- Biz komisyon için satıcıya e-Fatura keseriz (Nilvera ile)

### 6.6. Stok ve Rezervasyon

- `products.stock_quantity` ana stok
- Sepete eklendiğinde rezervasyon **YOK** (sepet uzun süre kalabilir)
- Checkout başlayınca **15 dk** Redis TTL key (`reserve:{product_id}:{user_id}` → quantity)
- Effective stock = `stock_quantity - SUM(active_reservations)`
- Ödeme başarılı → reservation → `confirmed_quantity` → stock düşülür
- Ödeme başarısız / TTL bitti → reservation otomatik silinir

### 6.7. Bildirim Sistemi

- Tüm bildirimler BullMQ job → notification service
- Channel: `email`, `sms`, `push`, `in_app` (websocket)
- Template'ler i18n (TR/EN) — `notification_templates` tablosunda
- Failed delivery → retry 3x backoff
- Audit: her bildirim `notifications_log` tablosuna

### 6.8. AI Bot

- Gemini Flash Lite 3.1
- Function list:
  - `searchProducts({ query, filters, limit })`
  - `getProductDetail({ id })`
  - `getCart()`
  - `addToCart({ productId, variation, quantity })`
  - `removeFromCart({ itemId })`
  - `updateCartItem({ itemId, quantity })`
  - `getAddresses()`
  - `getPaymentMethods()`
  - `placeOrder({ addressId, paymentMethodId })`
  - `getOrderStatus({ orderId })`
  - `contactSeller({ sellerId, message })`
- Konuşma persist edilmez (oturum sonunda silinir)
- Misafir → checkout function call'larında "giriş yapınız" hata kodu döner
- Rate limit: 60 mesaj/saat/kullanıcı

### 6.9. Boost Algoritması

- Boost paketleri (admin tanımlar):
  - 7 günlük paket (₺X)
  - 30 günlük paket (₺Y)
- Listing'lerde her 5 üründen 1'i (default %20) sponsorlu
- Aktif boost'lar arasında **rotasyon** (her satıcıya adil görünürlük)
- "Sponsorlu" rozeti zorunlu
- Boost ürünü tıklanırsa CTR sayılır (gelecekte CPC modeline geçiş için veri)

### 6.10. Kargo

İki mod:

**A) Self-managed:**
- Satıcı kendi kargosu ile gönderir
- Manuel takip no girişi
- Müşteri takip no'yu görür

**B) Integrated:**
- Aras / MNG / Yurtiçi / PTT entegrasyonları
- Sistem etiket üretir, satıcı yazdırır
- Otomatik tracking güncellemesi

Soğuk zincir ürünler için ayrı kargo seçeneği (frigo).

Kargo ücreti: satıcı belirler (sabit, ücretsiz limit, ürün ağırlığına göre).

### 6.11. e-Fatura / e-Arşiv (Nilvera)

- Sipariş `confirmed` olunca **e-Arşiv fatura** otomatik kesilir (müşteriye)
- Sipariş `completed` olunca **e-Fatura** kesilir (biz → satıcı, komisyon hizmet bedeli)
- Fatura PDF kullanıcı paneline indirilebilir
- Nilvera modülü `packages/invoicing/` altında, mevcut implementasyon adapte edilecek

### 6.12. Dispute Süreci (Otomatik)

```
Müşteri "İade aç" → return_requested
   ↓
Satıcıya bildirim (3 gün cevap süresi)
   ↓
Satıcı kabul → returned → refunded (Iyzico refund)
   ↓
Satıcı red → disputed
   ↓
Müşteriden ek delil (foto/video/açıklama)
   ↓
7 gün içinde anlaşma yoksa → super admin'e eskalasyon
   ↓
Super admin karar → resolved (lehte/aleyhte)
```

İade kargo ücreti:
- Satıcı kusurluysa → satıcı öder (refund'tan kesilir)
- Cayma hakkı → müşteri öder (refund'tan kesilir)

### 6.13. Yorum + Q&A

**Yorum:**
- Sadece satın alan kullanıcı yapabilir (verified purchase)
- 1–5 yıldız + metin + foto (opsiyonel)
- Satıcı yorumu cevaplayabilir (public)

**Q&A:**
- Herkes ürüne soru sorabilir (giriş yapmış)
- Satıcı cevap verebilir
- Satıcı "yayınla" derse public görünür (varsayılan gizli)

### 6.14. Sadakat + Referral

- Her ₺ harcama = X puan (admin tanımlı oran)
- Puan: bir sonraki siparişte indirim (1 puan = 0.01 ₺)
- Referral: kullanıcı kodunu paylaşır, kullanan kişi ilk siparişte indirim alır, paylaşan kullanıcı puan kazanır (ödeme `completed` olunca)

## 7. Non-Functional Gereksinimler

### 7.1. Performans

- Anasayfa LCP < 2.5s (3G "fast" üzerinde)
- API median response < 200ms (P95 < 500ms)
- Search response < 100ms (Meilisearch)
- Image: WebP/AVIF + responsive sizes, lazy load
- DB query: her query EXPLAIN ANALYZE ile, N+1 yasak

### 7.2. Ölçeklenebilirlik

- 100k aktif satıcı, 10M ürün, 1M ay sipariş hedef
- Postgres partition stratejisi (orders, order_items, stock_movements ay bazında)
- Read replica scale gerekirse
- Horizontal scale: NestJS pod'ları arkasında load balancer (Caddy)

### 7.3. Güvenlik

bkz. [SECURITY.md](SECURITY.md)

- KVKK uyum
- ETBİS kayıt
- 2FA satıcı + admin
- PII şifreleme (AES-256-GCM)
- Audit log
- RLS multi-tenant izolasyon
- Rate limit (Caddy + app)
- HTTPS only, HSTS
- CSP headers
- OWASP Top 10 önlemleri

### 7.4. Erişilebilirlik

- WCAG 2.1 AA seviyesi
- Klavye navigasyon
- Screen reader (semantic HTML + ARIA)
- Contrast ratio compliance

### 7.5. SEO

- Server-side render (Next.js RSC)
- Schema.org `Product`, `Offer`, `Review`, `BreadcrumbList`
- Sitemap.xml dinamik
- robots.txt
- Open Graph + Twitter Card meta

### 7.6. Reliability

- Hedef uptime: 99.5% (yıllık ~43 saat downtime tolerans)
- Backup: DB günlük dump + WAL streaming (PITR)
- Disaster recovery: RTO < 4 saat, RPO < 1 saat
- Health check endpoint'leri (Coolify + Uptime Kuma)

### 7.7. Compliance

- KVKK aydınlatma metni
- Açık rıza checkbox
- Mesafeli satış sözleşmesi (dinamik üretim, müşteri PDF indirir)
- Ön bilgilendirme formu
- Çerez politikası + banner
- ETBİS bildirim ve güncelleme süreci

## 8. Başarı Kriterleri (KPI)

| Kategori | Metrik | Hedef (6 ay) |
|---|---|---|
| Büyüme | Aktif satıcı sayısı | 200 |
| Büyüme | Aktif ürün sayısı | 5,000 |
| Büyüme | Kayıtlı kullanıcı | 10,000 |
| Engagement | Aylık aktif kullanıcı | 3,000 |
| Engagement | Tekrar alım oranı | %20 |
| Conversion | Sepet → ödeme dönüşümü | %35 |
| Conversion | Ziyaret → kayıt dönüşümü | %5 |
| Operasyon | Sipariş bildirim teslim oranı | %99 |
| Operasyon | Dispute oranı | < %2 |
| Finans | Aylık GMV | 500k ₺ |
| Performans | Anasayfa LCP | < 2.5s |
| Performans | API P95 | < 500ms |

## 9. Riskler ve Önlemler

| Risk | Etki | Olasılık | Önlem |
|---|---|---|---|
| Iyzico onboarding karmaşıklığı | Yüksek | Orta | Erken POC + Iyzico Türkiye desteğiyle direkt çalış |
| KVKK uyumsuzluk | Yüksek | Düşük | Hukuk danışmanlığı + audit + güvenli encryption |
| Gıda lojistik (soğuk zincir) maliyeti | Orta | Yüksek | İlk fazda manuel kargo zorunlu, soğuk için satıcı sorumluluğu |
| Multi-tenant veri sızıntısı | Çok yüksek | Düşük | RLS + tenant isolation testleri + audit log |
| Self-host outage | Yüksek | Orta | Coolify + monitoring + backup + DR plan |
| Sahte satıcı / dolandırıcılık | Yüksek | Orta | KYC süreci + Iyzico AML + super admin moderasyon |
| Boost spam / haksız rekabet | Düşük | Orta | "Sponsorlu" şeffaflık + admin denetim |
| AI bot hatalı sipariş | Orta | Orta | Sipariş tamamlamadan onay ekranı (bot bile bypass edemez) |

## 10. Yasal Çerçeve (Türkiye)

- **Mesafeli Satış Sözleşmesi** (6502 Tüketici Kanunu, 27.11.2014 yönetmeliği)
- **KVKK** (6698 sayılı kanun)
- **ETBİS** (Elektronik Ticaret Bilgi Sistemi) kaydı
- **e-Fatura/e-Arşiv** (5,000 ₺ üzeri B2B faturalar e-Fatura zorunlu)
- **Gıda satışı**: işletme kayıt belgesi (Tarım ve Orman Bakanlığı)
- **6563 sayılı E-Ticaret Kanunu** uyum (aracı hizmet sağlayıcı statüsü)

## 11. Ekler

- [ROADMAP.md](ROADMAP.md) — 7 fazlı yol haritası
- [ARCHITECTURE.md](ARCHITECTURE.md) — sistem mimarisi
- [DATABASE.md](DATABASE.md) — veri modeli
- [API.md](API.md) — endpoint contract'ları
- [DESIGN.md](DESIGN.md) — UI/UX tasarım dökümanı
- [SECURITY.md](SECURITY.md) — güvenlik gereksinimleri
- [DEPLOYMENT.md](DEPLOYMENT.md) — deploy süreci
