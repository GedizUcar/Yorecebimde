# ROADMAP — Yörecebimde

> 7 fazlı yol haritası. Her faz "production-ready" bir dilimle biter; faz biter, sonraki başlar.
> Detay her fazın kendi dosyasında: `docs/PHASES/PHASE-N-*.md`.

---

## Faz Özeti

| Faz | Ad | Süre (tahmin) | Çıktı |
|---|---|---|---|
| **1** | [Foundation](PHASES/PHASE-1-FOUNDATION.md) | 3-4 hafta | Monorepo, infra, auth, deploy hattı |
| **2** | [Catalog](PHASES/PHASE-2-CATALOG.md) | 4-5 hafta | Kategori, ürün, varyasyon, stok, indirim, search |
| **3** | [Checkout & Payment](PHASES/PHASE-3-CHECKOUT.md) | 4-5 hafta | Sepet, sipariş, Iyzico, fatura, kargo |
| **4** | [Seller Panel — Full](PHASES/PHASE-4-SELLER-PANEL.md) | 4-5 hafta | Başvuru, KYC, panel tam, müşteri chat, raporlar |
| **5** | [Super Admin Panel](PHASES/PHASE-5-SUPER-ADMIN.md) | 3-4 hafta | Onay, kategori, dispute, kupon, audit |
| **6** | [AI Bot + Boost + Loyalty + Referral](PHASES/PHASE-6-AI-BOT-BOOST.md) | 3-4 hafta | Gemini bot, boost algoritması, puan, referral |
| **7** | [Mobile + Hardening + Test](PHASES/PHASE-7-MOBILE-HARDENING.md) | 5-6 hafta | Expo app, KVKK/ETBİS, 2FA, pentest, load test |

**Toplam tahmini:** 26-33 hafta (6-8 ay)
**Paralel çalışma**: Faz 4 ve 5 son zamanlarında bazı işler paraleldir (apps/web içinde route group'lar zaten ayrı).

---

## Faz 1 — Foundation

**Hedef:** Boş proje → "Merhaba dünya" deploy hattı. Auth ve DB temelleri ayakta.

### Çıktılar
- Monorepo (Turborepo + pnpm)
- TypeScript strict baseline
- Lint + format + commit hooks
- Docker Compose dev altyapı (Postgres, Redis, MinIO, Meilisearch)
- Postgres + Drizzle migrations baseline
- RLS scaffolding
- Better-Auth setup (NestJS + Next.js entegrasyon)
- Tenant context middleware (DB context set)
- NestJS skeleton (modules, guards, interceptors)
- Next.js skeleton (App Router, route groups)
- shadcn/ui kurulum
- i18n (next-intl) TR/EN
- pino logger
- Caddy + Coolify staging deploy
- GitHub Actions CI (test + lint + typecheck + build)
- Sentry self-host + Grafana stack kurulu
- .env validation (Zod)

### Çıkış Kriteri
- `pnpm dev` çalışıyor
- Staging'de "Hoş geldin" sayfası açılıyor
- Auth: kayıt + login + 2FA çalışıyor (test kullanıcısı ile)
- Test coverage: temel auth flow

---

## Faz 2 — Catalog

**Hedef:** Satıcı ürün CRUD yapabilir, müşteri ürünleri görebilir + arayabilir.

### Çıktılar
- Kategori sistemi (hiyerarşik, generic derinlik)
- Kategori talep akışı (henüz panel yok ama API hazır)
- Ürün CRUD (REST endpoint'leri)
- Varyasyon sistemi (discrete + stepper)
- Birim listesi (kg/lt/adet vs.)
- Birim fiyat → toplam fiyat hesaplama
- İndirim sistemi (3 tip)
- KDV oran yönetimi (satıcı + default category)
- Stok yönetimi + audit hareketleri
- Düşük stok eşiği (bildirim Faz 3'te çalışacak ama tetikleyici hazır)
- Ürün görsel yükleme (MinIO presigned + WebP dönüşüm BullMQ job)
- Meilisearch index + sync (BullMQ job)
- Public listing API (kategori, fiyat, satıcı filter)
- Public ürün detay API
- Customer web: anasayfa, kategori sayfası, ürün detay, search
- Seller web: ürün listesi, ürün CRUD formu (varyasyon + indirim + stok)
- Image gallery component (max 3)
- Slug üretimi (TR-friendly)

### Çıkış Kriteri
- Bir satıcı admin paneline test girişiyle 10 ürün ekleyebiliyor
- Bir misafir kullanıcı anasayfa → kategori → ürün detay yolunu yürüyor
- Search ile "kayısı" yazınca sonuç geliyor
- Stok manuel düzenleme çalışıyor
- WebP dönüşüm sonrası 3 boy thumbnail var

---

## Faz 3 — Checkout & Payment

**Hedef:** Müşteri ürün satın alabilir, satıcı sipariş alır, para Iyzico üzerinden akar.

### Çıktılar
- Sepet (guest+user)
- Sepet birleştirme (login geçişi)
- Stok rezervasyonu (Redis 15 dk TTL)
- Adres CRUD (TR il/ilçe data)
- Kargo seçenekleri (self-managed + integrated — entegre kısmı Faz 4'te derinleşir)
- Soğuk zincir ürünleri için kargo filtreleme
- Iyzico sub-merchant onboarding API (satıcı KYC için Faz 4'te kullanılır)
- Iyzico 3DS payment flow
- Order + order_groups + order_items
- Sipariş state machine (pending → confirmed → ... → completed)
- Escrow scheduling (delivered + 14d)
- Payout (BullMQ + Iyzico payout API)
- Nilvera e-Arşiv fatura kesimi (sipariş confirmed olunca)
- Nilvera e-Fatura kesimi (komisyon, sipariş completed olunca)
- Bildirim sistemi (email + SMS)
  - NetGSM SMS provider
  - Resend email provider
  - Notification templates (handlebars + i18n)
- Sipariş bildirimleri (new order, confirmed, shipped, delivered, completed)
- Cancel/refund flow (basic)
- Müşteri "siparişlerim" sayfası
- Satıcı "siparişlerim" sayfası + state update aksiyonları
- WebSocket dashboard pop-up (yeni sipariş)

### Çıkış Kriteri
- Test kullanıcısı sandbox Iyzico ile sipariş tamamlıyor
- Satıcı paneline yeni sipariş pop-up'ı düşüyor
- Bildirim email + SMS gidiyor
- Fatura PDF kullanıcı paneline geliyor
- Satıcı sipariş confirm → shipped → delivered yapıyor, 14 gün sonra escrow release simüle edilebiliyor (manuel tetikleyici)

---

## Faz 4 — Seller Panel (Full)

**Hedef:** Gerçek satıcı onboarding, KYC, müşteri chat, finansal raporlar, dispute, boost satın alma — hepsi çalışıyor.

### Çıktılar
- Satıcı başvuru formu (şahıs + şirket)
- Belge yükleme (vergi levhası, IBAN, kimlik, gıda izin, vs.)
- Iyzico sub-merchant create (onay sonrası)
- Davet linki (mail + SMS)
- Hesap aktivasyon akışı
- Onboarding wizard (2FA setup, mağaza profili, ilk ürün)
- Seller dashboard (KPI: bugün/hafta/ay satış, pending sipariş, düşük stok)
- Stok uyarı bildirimi (mail + SMS) — Faz 2 tetikleyici + Faz 3 bildirim altyapısı birleşiyor
- Müşteri ↔ satıcı chat (WebSocket + REST history)
  - Sipariş bazlı thread
  - Direkt thread
- Satıcı raporları (CSV export)
  - Tarih filtreli satış raporu
  - Ürün bazlı ciro
  - Sehir bazlı dağılım
- Dispute akışı (satıcı tarafı): inceleme + kabul/red + delil yükleme
- Mağaza vitrin sayfası düzenleme (logo, kapak, hakkında, çalışma saatleri)
- Mağaza vitrin public sayfa (/magaza/<slug>)
- Boost paketleri görüntüleme + satın alma
- Boost ödeme (Iyzico)
- Aktif boost listesi + iptal
- Kargo entegrasyon API'leri (Aras / MNG / Yurtiçi / PTT)
  - Etiket üretimi
  - Tracking otomatik güncelleme
- e-Arşiv fatura PDF müşteriye email ile gönderim

### Çıkış Kriteri
- 5 test satıcısı baştan sona onboarding tamamlıyor (form → onay → davet → ilk ürün)
- Satıcı bir müşteriyle chat yapıyor (WS real-time)
- Düşük stok uyarısı mail+SMS olarak geliyor
- Bir satıcı boost satın alıyor, ürünü listing'de "Sponsorlu" rozetiyle (algoritmik kısmı Faz 6 ama placeholder boost slot var)
- Entegre Aras kargo etiketi yazdırılıyor
- Satıcı dispute talebine cevap veriyor

---

## Faz 5 — Super Admin Panel

**Hedef:** Bizim platform operasyonumuz tam çalışır. Bütün moderasyon ve finansal görünürlük.

### Çıktılar
- Super admin dashboard (GMV, aktif satıcı, pending başvuru, dispute, gelir)
- Başvuru yönetimi UI (filter, search, belge görüntüleme, onay/red/info-request)
- Satıcı listesi + askıya alma / kapatma
- Kategori CRUD UI (hiyerarşi düzenleme drag-drop)
- Kategori talep yönetimi (kabul, birleştir, red)
- Komisyon oran yönetimi (kategori bazlı)
- Boost paket yönetimi (CRUD)
- Kupon yönetimi (CRUD)
- Dispute eskalasyon yönetimi (delilleri görüntüle, karar ver)
- Audit log viewer (filter, export)
- Bildirim şablonu yönetimi (i18n editör)
- Sistem ayarları (escrow süresi, max foto, vs.)
- KVKK talep yönetimi (silme, erişim, taşınabilirlik)
- Müşteri destek chat (super admin tarafı)
- Finansal raporlar
  - GMV grafiği (gün/hafta/ay)
  - Komisyon geliri
  - Iyzico hareketleri reconciliation
  - Payout takvimi
- Reveal IBAN/TC action (audit log'a düşer)
- ETBİS rapor üretimi (manuel indirme — otomatize Faz 7)

### Çıkış Kriteri
- Super admin tüm operasyonel işleri panel üzerinden yapıyor (DB'ye hiç doğrudan dokunmadan)
- Eskalasyona düşmüş dispute karar verilip refund tetikleniyor
- Yeni kategori talebi onaylanıp kategoride beliriyor
- Audit log'a son 7 günlük admin aksiyonlarını incelenebiliyor

---

## Faz 6 — AI Bot + Boost Algoritması + Loyalty + Referral

**Hedef:** Akıllı ve büyüme odaklı özellikler. Bot satın alma yapabiliyor, boost algoritması canlı, sadakat sistemi çalışıyor.

### Çıktılar
- AI Bot (Gemini Flash Lite 3.1)
  - Web widget (sağ alt köşe)
  - Function calling (10+ function)
  - Auth-aware (misafir checkout yok)
  - Rate limit
  - Konuşma persist YOK (oturum bittiğinde silinir)
  - Yer tutucu cevaplar / typing indicator
- Boost algoritması
  - Listing'lerde %20 sponsorlu slot
  - Rotation algorithm (fairness)
  - Impression + click tracking
  - "Sponsorlu" rozeti tüm UI'larda
  - Satıcı boost performans raporu (impressions, clicks, CTR)
- Sadakat sistemi
  - Puan kazanma (₺ → puan oranı admin tanımlı)
  - Puan harcama (checkout'ta indirim)
  - Puan expiration (örn. 1 yıl)
  - Puan transaction geçmişi
- Referral sistemi
  - Kod üretimi (kullanıcı başına unique)
  - Yeni üye kayıt'ta kod uygulama
  - İlk sipariş tamamlanınca ödüllendirme (puan + indirim)
  - Referral istatistikleri (kullanıcı paneli)
- Yorum + puanlama sistemi (Faz 2'de schema vardı, UI burada gerçekleşir)
  - Sipariş completed sonrası yorum bırakma
  - Ürün ve mağaza rating güncellemesi
  - Satıcı cevabı
  - Admin moderasyonu (gizleme)
- Q&A sistemi UI
  - Müşteri ürün detayda soru
  - Satıcı cevap + yayınla bayrağı
  - Public Q&A görünümü

### Çıkış Kriteri
- AI bot bir kullanıcının "5kg kayısı al" demesiyle sepete ekleyip checkout'a yönlendirebiliyor
- Listing'de %20 sponsorlu slot doğru rotasyonla görünüyor
- Bir referral akışı baştan sona test ediliyor (paylaşan ödüllendirilip ödüllendirilmiyor)
- Kullanıcı yorum bırakıyor, satıcı cevaplıyor

---

## Faz 7 — Mobile + Hardening + Test

**Hedef:** Mobil app yayınlanır, platform üretim seviyesine güvenlik+performans olarak hardened.

### Çıktılar

**Mobile (Expo):**
- Kayıt + login (OTP)
- 2FA destek
- Anasayfa + kategori + ürün detay
- Search
- Sepet + checkout (Iyzico WebView 3DS)
- Adres yönetimi
- Beğendiğim ürünler
- Sipariş takibi + bildirim
- Push notification (Expo Push)
- Chat (WebSocket)
- AI Bot
- Biyometrik login (FaceID/TouchID)
- OTA update
- Sentry entegrasyon
- iOS + Android EAS build
- App Store + Play Store hazırlık (manifest, ikon, screenshot)

**Hardening:**
- KVKK uyumu tam
  - Aydınlatma metni v1
  - Açık rıza checkbox'ları
  - "Verilerimi indir" işlemi
  - "Hesabımı sil" işlemi (anonimleştirme)
- ETBİS kayıt + otomasyon
- Mesafeli satış sözleşmesi dinamik üretim
- Ön bilgilendirme formu
- Cookie banner + consent management
- PII encryption (TC, IBAN) — tüm geçmiş veriyi migrate
- 2FA zorunluluğu satıcı + admin
- Audit log retention policy uygulama
- Rate limit production tuning
- CSP + security headers final

**Test:**
- E2E test coverage > %70 critical flows
- Unit test coverage > %60
- Tenant isolation test suite tam
- Load test (k6)
  - 100 concurrent user → smoke
  - 1000 concurrent user → stress
  - Sustained traffic 24h → soak
- Pentest (3rd party)
- OWASP ZAP automated
- Accessibility audit (WCAG 2.1 AA)
- Performance audit (Lighthouse > 90)

**Monitoring tam:**
- Sentry release tracking
- Grafana dashboards (HTTP, DB, queue, business KPI)
- Loki log aggregation
- Uptime Kuma public status page
- Alert thresholds tuned

### Çıkış Kriteri
- Mobile app App Store + Play Store'da yayında
- 1000 concurrent user load test başarılı
- Pentest report → critical/high yok
- KVKK uyum audit yapıldı, eksikler kapatıldı
- Production go-live ready

---

## Milestone'lar

| Milestone | Tarih (T0 + ay) | Anlam |
|---|---|---|
| M1: Foundation tamam | T+1 | Auth + deploy hattı çalışıyor |
| M2: Catalog tamam | T+2 | İlk satıcı ürün ekledi (manuel onboard) |
| M3: Checkout tamam | T+3 | Test sipariş başarılı (sandbox) |
| M4: Seller panel tamam | T+4.5 | 5 pilot satıcı onboard |
| M5: Super admin tamam | T+5.5 | Operasyon tam panel üzerinden |
| M6: AI + Boost tamam | T+6.5 | Soft launch (closed beta) |
| M7: Mobile + Hardening tamam | T+8 | Public launch, mobile stores live |

---

## Risk ve Bağımlılıklar

| Risk | Faz | Plan |
|---|---|---|
| Iyzico onboarding süresi | Faz 3 | Faz 1'de başvuru başlat, Iyzico TR desteğiyle paralel |
| Nilvera entegrasyon değişikliği | Faz 3 | Mevcut modül adaptasyonu erken Faz 3'te |
| App Store onay süreci | Faz 7 | İlk submission Faz 7 ortasında, revizyon süresi tampon |
| KVKK denetim gereksinimi | Faz 7 | Hukuk danışmanlığı Faz 4'te başlasın |
| Pentest bulgu fazlığı | Faz 7 | Faz 5'te internal sec review |

---

## Faz Geçiş Kuralları

Her faz sonunda:
1. **Demo**: ekibe canlı demo
2. **Retro**: ne çalıştı, ne çalışmadı (tasks/lessons.md'ye yaz)
3. **Test coverage**: kritik path'lar tam mı?
4. **Performance check**: P95 < 500ms hala mı?
5. **Security spot check**: yeni eklenenler RLS'ye uyumlu mu?
6. **Doc update**: Bu doc + ilgili PHASE-N dosyaları güncel mi?

Yeni faz başlamadan önce:
- Önceki faz çıkış kriteri %100 yeşil
- `tasks/todo.md` yeni faza göre güncellenir
