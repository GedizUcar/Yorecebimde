# PHASE 5 — Super Admin Panel

> Hedef: Platform operasyonumuzun tamamı panel üzerinden yürür. DB'ye doğrudan dokunma ihtiyacı sıfır.
> Süre: 3-4 hafta.

---

## 1. Hedefler

1. Süper admin dashboard (GMV, aktif satıcı, başvuru, dispute, gelir)
2. Satıcı başvuru yönetimi UI
3. Satıcı yönetimi (askıya alma, kapatma)
4. Kategori CRUD (drag-drop hiyerarşi)
5. Kategori talep yönetimi
6. Komisyon oran yönetimi (kategori bazlı)
7. Boost paket yönetimi
8. Kupon yönetimi
9. Dispute eskalasyon yönetimi
10. Audit log viewer
11. Bildirim şablonu yönetimi (i18n editör)
12. Sistem ayarları (escrow süresi, foto limiti vs.)
13. KVKK talep yönetimi
14. Müşteri destek chat
15. Finansal raporlar (GMV, komisyon, Iyzico recon)
16. PII reveal action (audit'li)

## 2. Detaylı Task Listesi

### 2.1. Admin Layout (apps/web `(admin)`)
- [x] Layout: sidebar nav (7 link — Dashboard, Applications, Sellers, Categories, Disputes, Boost, Audit)
- [x] Permission: `assertAdmin(role in ['admin','super_admin'])` her endpoint'te
- [x] Kullanıcı + çıkış sidebar altında
- [ ] **Faz 5.2'ye ertelendi** — Topbar arama + bildirim badge
- [ ] **Faz 5.2'ye ertelendi** — Light/dark theme
- [ ] **Faz 5.2'ye ertelendi** — Coupons + KVKK + Settings nav (modülleri eklenince)

### 2.2. Admin Dashboard
- [x] `GET /v1/admin/dashboard` — GMV (today/week/month/total) + counts (active sellers, pending apps, open/escalated disputes)
- [x] UI: KPI kartları + tile linkler (urgent badge ile)
- [ ] **Faz 5.2'ye ertelendi** — GMV trend grafik (recharts)
- [ ] **Faz 5.2'ye ertelendi** — KVKK + commission income + Iyzico balance (modüller hazır olunca)
- [ ] **Faz 5.2'ye ertelendi** — Yeni başvurular feed live update

### 2.3. Seller Applications
- [x] `/admin/applications` — status filter chip'ler (pending/approved/rejected/all)
- [x] Tablo: mağaza adı, tür, email, durum, tarih
- [x] Modal detay: form bilgileri + onay/red butonları + notes alanı
- [x] Approve → Iyzico submerchant stub create + invite token üret + UI'da link göster (kopyala butonu)
- [x] Reject → notes zorunlu (min 10 char)
- [x] Audit log: `seller_application.approve/reject` (admin.service.auditLog hook)
- [ ] **Faz 5.2'ye ertelendi** — Belge görüntüleyici (MinIO upload sonrası)
- [x] Reveal IBAN/TC (audit'li PII unmask) — Faz 5.2 ✓
- [ ] **Faz 5.2'ye ertelendi** — "Ek bilgi iste" akışı (info_requested status)
- [ ] **Faz 5.2'ye ertelendi** — Davet email otomatik gönder (Resend gerçek olunca)

### 2.4. Sellers Management
- [x] `/admin/sellers` — tablo (ad, tür, durum, rating, satış) + status filter
- [x] Aksiyonlar: suspend / reinstate / close (close = reason prompt)
- [x] Audit log her aksiyonda (`seller.suspended/approved/closed`)
- [ ] **Faz 5.2'ye ertelendi** — Detay sayfası (profil + finansal + dispute geçmişi)
- [x] Manuel komisyon override — Faz 5.2 ✓
- [ ] **Faz 4.3'e ertelendi** — Iyzico sub-merchant resync (gerçek API olunca)
- [x] PII reveal (IBAN/TC unmask + audit) — Faz 5.2 ✓

### 2.5. Categories
- [x] `/admin/categories` — path-sorted ağaç listesi (indented), inline edit
- [x] CRUD: POST `/v1/admin/categories` + PATCH + DELETE (alt kategori varsa engellenir)
- [x] Yeni alt kategori (parentId select dropdown)
- [x] Default KDV oranı (her kategori için ayrı)
- [x] Audit log her aksiyonda
- [ ] **Faz 5.2'ye ertelendi** — Drag-drop reorder (react-dnd-treeview)
- [ ] **Faz 5.2'ye ertelendi** — Icon upload (MinIO)
- [ ] **Faz 5.2'ye ertelendi** — Bulk CSV import
- [ ] **Faz 5.2'ye ertelendi** — Default commission rate

### 2.6. Category Requests
- [ ] **Faz 5.2'ye ertelendi** — Schema ve UI birlikte (seller tarafında talep formu da yok şu an)

### 2.7. Disputes (Admin)
- [x] `/admin/disputes` — status filter chip'ler, eskalasyon kırmızı kart ile öne çıkar
- [x] Müşteri mesajı + satıcı cevabı yan yana gösterilir
- [x] Karar modal: winner (customer/seller/split) + refund amount + decision notes
- [x] `POST /v1/admin/disputes/:id/resolve` — status update + order.status update + audit log
- [x] Refund stub log (gerçek Iyzico Faz 4.3'te)
- [ ] **Faz 5.2'ye ertelendi** — Müşteri/satıcı önceki dispute geçmişi panel
- [ ] **Faz 5.2'ye ertelendi** — Evidence (foto/video) görüntüleyici (MinIO upload sonrası)
- [ ] **Faz 5.2'ye ertelendi** — Return shipping responsibility field
- [ ] **Faz 5.2'ye ertelendi** — Notification trigger (buyer + seller'a karar)

### 2.8. Coupons
- [ ] **Faz 6'ya ertelendi** — Coupons modülü (sadakat / kampanya fazı)

### 2.9. Boost Packages
- [x] `/admin/boost-packages` — CRUD UI (ad, süre, fiyat, aktif toggle)
- [x] Endpoints: GET/POST/PATCH/DELETE `/v1/admin/boost-packages`
- [x] Audit log her aksiyonda
- [ ] **Faz 6'ya ertelendi** — Boost satış raporu + `boost_ratio_percent` ayarı
- [ ] **Faz 5.2'ye ertelendi** — Ad TR/EN ayrı alan (şu an tek `name`)

### 2.10. Audit Log Viewer
- [x] `/admin/audit` — action + targetType filter + limit (50/100/500/1000)
- [x] Tablo + metadata JSON detay (expandable row)
- [x] Max 1000 satır per query enforce
- [x] Date range filter UI — Faz 5.2 ✓
- [ ] **Faz 6'ya ertelendi** — Before/after diff view (beforeData/afterData schema'da var)
- [x] CSV export (PII mask) — Faz 5.2 ✓
- [ ] **Faz 7'ye ertelendi** — Partition pruning (audit_logs partitioning)

### 2.11. KVKK Requests
- [x] Schema (`kvkk_requests` + 5-tip enum) — Faz 5.2 ✓
- [x] Public form `/kvkk-talep` — Faz 5.2 ✓
- [x] Admin `/admin/kvkk` — status filter + 30g deadline + response modal — Faz 5.2 ✓

### 2.12. Notification Templates
- [x] DB-backed `notification_templates` (triggerKey × channel × locale unique) — Faz 5.2 ✓
- [x] Admin `/admin/templates` editör + `{{var}}` interpolation help — Faz 5.2 ✓
- [ ] **Faz 6'ya ertelendi** — Live preview render + test gönder + Monaco syntax highlight

### 2.13. System Settings
- [x] `system_settings` tablosu (category bazlı + isSecret mask) — Faz 5.2 ✓
- [x] Admin `/admin/settings` 7 sekmeli UI — Faz 5.2 ✓

### 2.14. Customer Support Chat
- [ ] **Faz 6'ya ertelendi** — AI bot ile birlikte (aynı widget)

### 2.15. Financial Reports
- [ ] **Faz 4.3'e ertelendi** — Gerçek Iyzico reconciliation gerekli (şu an stub)

### 2.16. ETBİS Manual Export
- [ ] **Faz 7'ye ertelendi** — Compliance & hardening fazı

### 2.17. Admin Users (super_admin only)
- [x] `/admin/team` — list + role promote/demote + suspend (self-suspend engelli) — Faz 5.2 ✓
- [ ] **Faz 6'ya ertelendi** — Create admin invite (yeni admin davet flow'u)

### 2.18. Testing
- [x] Manuel E2E: super_admin login → dashboard → category create+update+delete → audit log doğrulandı
- [ ] **Faz 7'ye ertelendi** — Unit guards + Integration + Playwright E2E

## 3. Çıkış Kriteri (Faz 5.1 MVP)

- [x] Süper admin temel operasyonu panel üzerinden yapıyor — başvuru, satıcı, kategori, boost, dispute, audit
- [x] Başvuru onay süreci yürüyor: pending → approve → invite link üretilir → satıcı `/satici-davet/[token]` ile hesap açar
- [x] Eskale dispute karara bağlanıyor → order status=refunded + audit log
- [x] Audit log tüm admin aksiyonlarını gösteriyor (action + targetType + metadata filtreli)
- [x] Kategori CRUD + drag-drop placeholder (Faz 5.2)
- [x] Boost paket CRUD (3 default paket seed'li)
- [x] Faz 5.1 demo — staging'de canlı

## 3.1 Faz 5.2 — Tamamlandı (2026-05-12)

| Özellik | Endpoint(ler) | UI | Notlar |
|---|---|---|---|
| PII reveal (audit'li) | `POST /v1/admin/sellers/:id/reveal-pii` | `admin-sellers-list.tsx` "🔓 IBAN" butonu | reason zorunlu (min 10 char). field ∈ {iban, taxId, tcKimlik}. AES-256-GCM decrypt, `fake:` prefix base64 fallback. Audit: `seller.pii_reveal.<field>` |
| Manuel komisyon override | `POST /v1/admin/sellers/:id/commission-override` | `admin-sellers-list.tsx` "Komisyon" butonu | 0-50 range, null kaldır. Audit: `seller.commission_override`. Kategori default'una düşer NULL'da |
| Admin team CRUD | `GET/POST /v1/admin/team`, `/role`, `/suspend` | `/admin/team` sayfası | super_admin → admin / admin → super_admin promote/demote. Self-suspend engelli |
| System settings (DB-backed) | `GET/PUT/DELETE /v1/admin/settings` | `/admin/settings` (7 sekme) | category bazlı; isSecret değerler `***` ile maskeli. JSON value parse'lı |
| Notification template editör | `GET/PUT /v1/admin/templates` | `/admin/templates` | triggerKey × channel × locale unique. 9 trigger × 4 channel. `{{var}}` interpolation help |
| KVKK requests | `POST /v1/kvkk/request` (public), `GET/PATCH /v1/admin/kvkk-requests` | `/kvkk-talep` (public form) + `/admin/kvkk` | 5 tip (access/deletion/rectification/portability/objection). 30 günlük deadline auto. Urgency badge |
| Audit: date range + CSV | `GET /v1/admin/audit?from&to`, `GET /v1/admin/audit/export.csv` | `admin-audit-viewer.tsx` "CSV İndir" + date input | `created_at,actor_user_id,actor_role,action,target_type,target_id` |

**Schema:** `packages/db/src/schema/admin.ts` — `system_settings`, `notification_templates`, `kvkk_requests` (+ enums) + `sellers.commission_rate_override`. Migration: `0006_brainy_ultimo.sql`.

### Faz 5.2 — Erteleme devam ediyor

- Coupons (Faz 6 birlikte — sadakat/kampanya)
- Customer support chat (Faz 6 AI bot ile)
- Financial reports — gerçek Iyzico reconciliation (Faz 4.3 entegrasyon sonrası)
- ETBİS export (Faz 7)
- Drag-drop kategori reorder UI (komponent yok, react-dnd-treeview install gerekli)
- Belge görüntüleyici (MinIO upload pipeline'ı tamamlandığında)
- Audit before/after diff viewer (beforeData/afterData zaten schema'da var, sadece UI eksik)

## 3.2 Eski (orijinal kriter — Faz 5.2 hedefi)

- [ ] 10 başvuru bekleyen kuyruktan onay süreci yürüyor
- [ ] Eskalasyona düşen dispute karar verilip refund tetikleniyor
- [ ] Audit log son 30 günlük tüm admin aksiyonları gösteriyor
- [ ] Komisyon oran değişikliği → yeni siparişlere yansıyor (mevcut akış etkilenmiyor)
- [ ] Kategori drag-drop reorder çalışıyor
- [ ] Notification template edit → e-mail preview ile test gönderildi
- [ ] Finance reconciliation Iyzico balance ile %95+ match
- [ ] Audit log read-only, append-only — manuel UPDATE deneme test edildi (RLS DENY)
- [ ] Faz 5 demo

## 4. Riskler

| Risk | Önlem |
|---|---|
| Permission granular kontrol (admin vs super_admin) karışıklık | Decorator-based + matrix doc + test cover |
| PII reveal kötüye kullanım | Audit + 2-eye approval (gelecek), max reveal rate |
| Audit log büyük dataset query yavaş | Partition pruning + index'leri doğrula |
| Notification template render hatası prod'a sızar | Versiyon kontrolü + preview zorunlu + rollback |
| Reconciliation mismatch insider fraud belirtisi | Otomatik alert + dual review |

## 5. Sonraki Faza Geçiş (Faz 6)

Faz 6'nın ön koşulları:
- Boost paketleri admin tanımlanmış (algorithma yazılabilir)
- Notification template'leri tam (AI bot da kullanır)
- Kupon altyapısı (referral'da kullanılır)
- Yorum/Q&A schema vardı (UI Faz 6)
