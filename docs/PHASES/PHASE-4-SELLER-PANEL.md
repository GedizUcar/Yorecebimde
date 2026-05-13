# PHASE 4 — Seller Panel (Full)

> Hedef: Satıcı baştan sona gerçek onboarding'den sürekli operasyona kadar tüm akışını platform üstünde yürütüyor.
> Süre: 4-5 hafta.

---

## 1. Hedefler

1. Satıcı başvuru formu (şahıs + şirket) + belge yükleme
2. Iyzico sub-merchant otomatik oluşturma
3. Davet linki + 2FA onboarding wizard
4. Tam seller dashboard (KPI, anlık sipariş, düşük stok)
5. Müşteri ↔ satıcı chat (WebSocket real-time)
6. Stok uyarı bildirimleri canlı
7. Satıcı raporları (CSV export)
8. Dispute akışı satıcı tarafı
9. Mağaza vitrin sayfası edit + public görünüm
10. Boost paketleri (satın alma kısmı — algoritma Faz 6'da)
11. Kargo entegrasyonları (Aras, MNG, Yurtiçi, PTT)

## 2. DB Migrasyonları

Yeni / aktif edilecek tablolar:
- `seller_applications`, `seller_documents`
- `disputes`
- `chat_threads`, `chat_messages`
- `boost_packages`, `seller_boosts`
- `system_settings` (komisyon oranı vs. dışarı çıkar)

## 3. Detaylı Task Listesi

### 3.1. Seller Application Flow
- [x] Public başvuru formu `/satici-ol` — şahıs/şirket toggle + tek-sayfa form
- [x] Endpoints:
  - `POST /v1/sellers/applications` (public)
  - `GET /v1/sellers/applications/:id` (status query)
- [x] PII encryption: TC kimlik, vergi no, IBAN — AES-256-GCM (`encryptToString` shared/crypto)
- [x] Notify (stub): super admin'e log-bildirim
- [ ] **Faz 4.2'ye ertelendi** — Multi-step form (6 adım) + belge yükleme MinIO presigned
- [ ] **Faz 4.2'ye ertelendi** — Audit log entry'leri

### 3.2. Admin Review (super_admin)
- [x] Endpoints:
  - `GET /v1/admin/sellers/applications` (status filter + pagination)
  - `GET /v1/admin/sellers/applications/:id`
  - `POST /v1/admin/sellers/applications/:id/approve`
  - `POST /v1/admin/sellers/applications/:id/reject`
- [x] Approve akışı: seller entity yarat + Iyzico sub-merchant stub + invite token (32 byte hex, 7g)
- [x] Iyzico sub-merchant — stub call (Faz 4.2'de gerçek)
- [ ] **Faz 5'e ertelendi** — UI (super admin panel) + request-info action
- [ ] **Faz 4.2'ye ertelendi** — Audit log + invite email (gerçek Resend)

### 3.3. Onboarding Wizard
- [x] Davet linki redeem `/satici-davet/[token]`:
  - `POST /v1/sellers/invites/redeem` — token verify
  - Better-Auth signUp.email — kullanıcı oluştur
  - `POST /v1/sellers/invites/complete` — users.role='seller' + seller.userId set
- [x] Welcome sayfası `/seller/onboarding` — 3 adım kart (mağaza, ürün, panel)
- [ ] **Faz 4.2'ye ertelendi** — 2FA setup zorlama
- [ ] **Faz 4.2'ye ertelendi** — Onboarding tamamlanmadan diğer sayfalara erişim engeli

### 3.4. Seller Dashboard
- [x] **Faz 2'de**: `/seller/dashboard` — 4 stat kartı (toplam/aktif/taslak/stok) + son ürünler + Faz 3 placeholder
- [ ] **Faz 4.2'ye ertelendi** — `GET /v1/sellers/me/dashboard` aggregate endpoint (GMV, pending, low stock, mesaj sayısı)
- [ ] **Faz 4.2'ye ertelendi** — Son 7 gün satış grafiği (recharts)
- [ ] **Faz 4.2'ye ertelendi** — Bildirim feed (notifications_log son 10)

### 3.5. Sales Reports
- [x] **Faz 4.2**: `SellerReportsModule` — `kpis()`, `sales()`, `exportCsv()`
- [x] **Faz 4.2**: Endpoints `/v1/seller/reports/kpis` + `/sales` + `/sales/export.csv`
- [x] **Faz 4.2**: 4 KPI kartı (bugün/hafta/ay/pending) + CSV export tarih filtreli
- [x] **Faz 4.2**: UI `/seller/reports`
- [ ] **Faz 4.3'e ertelendi** — Recharts grafikler (ciro trendi, kategori dağılımı, şehir dağılımı)
- [ ] **Faz 4.3'e ertelendi** — Komisyon + payout sütunları (Iyzico marketplace gerçek olunca)

### 3.6. Müşteri ↔ Satıcı Chat
- [x] Schema: `chat_threads` + `chat_messages` + sender_role enum + unread_counts JSON
- [x] Endpoints: list, start (order/direct), get/send messages, mark-read
- [x] Permission: order thread = order ownership, direct thread = anti-spam (en az 1 sipariş)
- [x] **Faz 4.2**: RealtimeService — native `ws` library + Fastify upgrade handler
- [x] **Faz 4.2**: Cookie-based auth on handshake (Better-Auth session)
- [x] **Faz 4.2**: Thread-scoped subscribe pattern (`{type:'subscribe', threadId}`)
- [x] **Faz 4.2**: Heartbeat (30sn ping/pong) + otomatik reconnect (2sn)
- [x] **Faz 4.2**: ChatService.sendMessage → RealtimeService.broadcastNewMessage hook
- [x] **Faz 4.2**: nginx `/ws` location (Upgrade/Connection headers, 1h timeout)
- [x] **Faz 4.2**: Frontend `useChatSocket` hook — WS açıkken canlı, kapalıyken 6sn polling fallback
- [x] UI: `/seller/messages` + `/hesabim/mesajlarim` (status badge: 🟢 Canlı / 🟡 Bağlanıyor / ⚪ Polling)
- [ ] **Faz 4.3'e ertelendi** — Attachment upload (MinIO presigned)
- [ ] **Faz 4.3'e ertelendi** — Yeni mesaj email/push bildirim trigger
- [ ] **Faz 7'ye ertelendi** — Redis pub/sub (multi-instance horizontal scale)

### 3.7. Stok Uyarı Bildirimi
- [x] **Faz 4.2**: `low-stock-check` cron (her gün 09:00) — `StockService.findLowStockProducts()`
- [x] **Faz 4.2**: `notifyLowStockToSeller` trigger — email template + log
- [x] **Faz 4.2**: 24h throttle (process-level memo, aynı (seller,product) için)
- [ ] **Faz 4.3'e ertelendi** — User preference (email/SMS opt-in) — `/seller/settings/account`'a eklenecek
- [ ] **Faz 4.3'e ertelendi** — Throttle memo'sunu Redis'e taşı (multi-instance için)

### 3.8. Disputes — Seller Side
- [x] Service: openByUser, respondBySeller (accept/reject), listByUser/Seller
- [x] Endpoints: customer (`/v1/disputes`) + seller (`/v1/seller/disputes`)
- [x] Accept akışı: dispute='resolved_customer' + order='returned' + refund log (Faz 4.2 gerçek)
- [x] Reject akışı: dispute='seller_responded' + auto_escalate_at = now + 7g
- [x] UI: `/seller/disputes` liste + cevap formu, `/hesabim/iadelerim` müşteri görünümü
- [x] Sipariş detaydan "İade aç" butonu (delivered/shipped status'unda)
- [x] **Faz 4.2**: `dispute-escalation` cron (15 dakikada bir tara, 7g geçen seller_responded → escalated)
- [ ] **Faz 4.3'e ertelendi** — Refund gerçek Iyzico çağrısı (şu an log)
- [ ] **Faz 4.3'e ertelendi** — Evidence upload (foto) MinIO presigned
- [ ] **Faz 4.3'e ertelendi** — Eskalasyon → super admin email/in-app bildirim

### 3.9. Mağaza Vitrin
- [x] `/seller/settings/store` — bio, logo URL, kapak URL, iletişim, il/ilçe edit
- [x] `GET /v1/seller/store` + `PATCH /v1/seller/store`
- [x] Public `/magaza/[slug]` zaten Faz 2'de var — yeni alanları yansıtır
- [ ] **Faz 4.2'ye ertelendi** — Logo/kapak MinIO presigned upload (URL girilebiliyor şu an)
- [ ] **Faz 4.2'ye ertelendi** — Markdown editor (textarea şimdilik)
- [ ] **Faz 4.2'ye ertelendi** — Çalışma saatleri visual editor (schema hazır)

### 3.10. Boost
- [x] Schema: `boost_packages` + `seller_boosts` + paymentRef tracking
- [x] Seed: 7gün — 100₺, 30gün — 350₺, 90gün — 900₺
- [x] Endpoints: list packages, purchase (Iyzico stub 3DS), list mine, cancel
- [x] UI `/seller/boost` — paket seç + ürün seç + Iyzico ile öde
- [x] Aktif boost listesi (impressions/clicks placeholder Faz 6'da artar)
- [ ] **Faz 6'ya ertelendi** — Algoritmik interleave (listing'de Sponsorlu slot)
- [ ] **Faz 4.2'ye ertelendi** — Aynı ürüne ikinci paket = süre uzatma

### 3.11. Kargo Entegrasyonları
- [x] `IShippingProvider` adapter pattern (`apps/api/src/modules/shipping/`)
- [x] **STUB** Aras/MNG/Yurtiçi/PTT — `createShipment` + `track` log-based
- [x] `listOptions(address, isColdChain)` — fiyat + bölge mock
- [x] Soğuk zincir filtresi (Yurtiçi only — gerçeği Faz 4.2)
- [ ] **Faz 4.2'ye ertelendi** — Gerçek API'ler (Aras REST, MNG token, Yurtiçi REST, PTT)
- [ ] **Faz 4.2'ye ertelendi** — PDF etiket üretimi
- [ ] **Faz 4.2'ye ertelendi** — Tracking webhook (delivered otomatik)

### 3.12. Seller Profile Settings
- [x] **Faz 4.2**: `/seller/settings/account` — profil görüntü + şifre değiştir (Better-Auth `changePassword`)
- [x] **Faz 4.2**: Şifre değiştirince diğer oturumları revoke
- [ ] **Faz 4.3'e ertelendi** — Profil edit (ad/soyad/telefon)
- [ ] **Faz 4.3'e ertelendi** — 2FA TOTP setup + backup kodlar
- [ ] **Faz 4.3'e ertelendi** — Bildirim tercih UI (email/SMS event bazlı opt-in)
- [ ] **Faz 4.3'e ertelendi** — Otomatik sipariş kabul opsiyonu

### 3.13. Testing
- [x] Encryption round-trip — Faz 1'de unit test'leri var
- [ ] **Faz 7'ye ertelendi** — Dispute state machine + Boost overlap + Integration + E2E (Testcontainers + Playwright)

## 4. Çıkış Kriteri (Faz 4.1 + 4.2 — stub-based MVP + WebSocket)

- [x] Test satıcı `/satici-ol` ile başvuru → admin onay → davet → onboarding tamam akış
- [x] Iyzico sub-merchant **STUB** — Faz 4.3'te gerçek
- [x] **Faz 4.2**: Chat WebSocket canlı — `wss://yorecebimde-staging.gkteches.com/ws` 101 Switching Protocols ✓
- [x] **Faz 4.2**: Dispute escalation cron aktif (15 dk poll)
- [x] **Faz 4.2**: Low stock cron aktif (her gün 09:00) + 24h throttle
- [x] **Faz 4.2**: Sales CSV export + KPI dashboard
- [x] **Faz 4.2**: `/seller/settings/account` + şifre değiştir
- [x] Kargo adapter pattern (stub Aras/MNG/Yurtiçi/PTT) — gerçek API Faz 4.3
- [x] Boost satın alma akışı — Iyzico stub 3DS ile çalışıyor
- [x] Mağaza vitrin edit — `/seller/settings/store`
- [x] Faz 4.2 demo — staging'de canlı

## 4.1 Faz 4.3 Borçları (gerçek entegrasyon zamanı)

| Stub / Eksik | Faz 4.3 işlemi | Dosya |
|---|---|---|
| Iyzico sub-merchant | Gerçek API çağrısı | `apps/api/src/modules/payments/iyzico.provider.ts` |
| Iyzico refund (dispute accept) | Gerçek API çağrısı | `disputes.service.ts` |
| Aras / MNG / Yurtiçi / PTT | Gerçek REST clients + label PDF | `shipping.service.ts` |
| Belge yükleme (başvuru + dispute evidence) | MinIO presigned + virus scan | `seller-applications` + `disputes` |
| 2FA enforce | Better-Auth TOTP + onboarding wizard step | Better-Auth config + middleware |
| Recharts grafikler | Sales aggregate by date/category | `seller-reports.service.ts` |
| Bildirim tercih UI | `notification_preferences` tablosu + opt-in formu | Yeni: `notification-prefs` modülü |
| Profil edit | First/last name + phone + kvkk_version_accepted | Users module |
| Chat attachment | MinIO presigned + virus scan + thumbnail | `chat.service.ts` |
| Yeni mesaj email/push trigger | Notifications trigger | `chat.service.ts` |
| Auto-accept order opsiyonu | Seller preference field | Sellers schema |

## 5. Riskler

| Risk | Önlem |
|---|---|
| Aras/MNG API'leri eski, dokümantasyon zayıf | Erken POC, kargo şirketi teknik desteği |
| KYC belge doğrulama (Tarım izin belgesi) manuel zor | Super admin checklist + 2. admin onayı |
| Chat scale sorunu | Redis pub/sub fallback, mesaj history pagination |
| 2FA setup karmaşık satıcı için | Video rehber + 1-1 destek (ilk hafta) |
| Kargo etiket çıktısı format hatası | PDF preview önce, gerçek kargoda test |

## 6. Sonraki Faza Geçiş (Faz 5)

Faz 5'in ön koşulları:
- Application admin API'leri var (UI Faz 5)
- Dispute escalation çalışıyor
- Audit log altyapısı (Faz 1'de hazırdı, kullanım yoğunlaşacak)
- Boost paketleri seed var (admin CRUD UI Faz 5)
