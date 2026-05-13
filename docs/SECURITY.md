# SECURITY — Yörecebimde

> KVKK uyumu, kimlik doğrulama (2FA), yetkilendirme, multi-tenant izolasyon (RLS), encryption,
> audit log, rate limit, OWASP Top 10 önlemleri, KVKK + ETBİS süreçleri.

---

## 1. Tehdit Modeli (Threat Model)

| Tehdit | Etki | Önlem |
|---|---|---|
| Cross-tenant veri sızıntısı (satıcı A → B'nin verisi) | Çok yüksek | RLS + app-level filter + audit log + isolation tests |
| Kullanıcı kimlik hırsızlığı | Yüksek | 2FA, hashed password (bcrypt/argon2), session rotation, secure cookie |
| Ödeme dolandırıcılığı | Yüksek | Iyzico fraud detection + 3DS zorunlu + IP/device tracking + velocity check |
| SQL injection | Çok yüksek | Drizzle parameterized queries (raw SQL yasak), eslint-plugin-security |
| XSS | Yüksek | React default escape + CSP header + DOMPurify HTML render |
| CSRF | Orta | SameSite=Strict cookie + double-submit token (NestJS guard) |
| Brute force login | Orta | Rate limit + IP block + reCAPTCHA gerekirse |
| Yetkisiz API erişimi | Yüksek | Auth guard + role check + audit |
| MITM | Orta | HTTPS only + HSTS + cert pinning (mobile) |
| File upload exploit | Yüksek | MIME type check + size limit + ClamAV + presigned URL (write-only) |
| AI prompt injection | Orta | Bot persona prompt'unda iş kuralları, function output sanitize, rate limit |
| Insecure deserialization | Yüksek | Zod validation her API boundary'de |
| Supply chain attack | Orta | pnpm audit + Renovate + lockfile commit + SBOM |
| Insider threat (admin abuse) | Yüksek | Audit log + read-only viewer + admin 2FA zorunlu + change approval gerekirse |
| DDoS | Orta | Caddy rate limit + Cloudflare/BunnyCDN (ileride) + autoscale |

---

## 2. Authentication

### 2.1. Mekanizma

- **Web**: Better-Auth cookie session (HttpOnly, Secure, SameSite=Strict, signed)
- **Mobile**: JWT access (15 dk) + refresh (30 g, rotation ile)
- **Refresh rotation**: her refresh sonrası eski token revoke + yeni access + yeni refresh
- **Service-to-service**: HMAC imzalı service token (`X-Service-Token: <hmac>`)

### 2.2. Şifre Politikası

- Min 10 karakter
- En az 1 büyük harf, 1 küçük harf, 1 rakam
- Bilinen şifre listesinde olmamalı (HIBP API)
- Argon2id hash (memory 64MB, iterations 3, parallelism 4)
- Önceki 5 şifreyi kullanma yasak

### 2.3. 2FA (Two-Factor Authentication)

- **TOTP** (Google Authenticator, 1Password, Authy)
- **Satıcı + admin için zorunlu** (onboarding sırasında setup)
- **Kullanıcı için opsiyonel** (ama önerilir)
- **Backup codes**: 10 adet, hashlenmiş saklanır
- **Yeniden setup**: super admin manuel reset (audit log)

### 2.4. OTP (SMS)

- 6 haneli sayısal kod
- 5 dakika TTL
- Aynı telefona 3 dakikada max 1 SMS
- 5 yanlış denemede 30 dk lock

### 2.5. OAuth (İleride)

- Google, Apple OAuth desteği (Better-Auth provider'ları)
- KVKK uyumlu açık rıza (ilk girişte profil eşleme onayı)

### 2.6. Session Yönetimi

- Cookie: `HttpOnly`, `Secure`, `SameSite=Strict`
- Token rotation her refresh'te
- "Aktif oturumlar" sayfası — kullanıcı kendi session'larını görür ve sonlandırabilir
- Devices: device fingerprint (user-agent + IP) saklanır
- Şüpheli aktivite (farklı IP/ülke) → email uyarısı
- Tek yerden çıkış: tüm session'ları logout

---

## 3. Authorization

### 3.1. Role-Based (RBAC)

| Rol | Yetki |
|---|---|
| `customer` | Kendi siparişleri, sepet, profil; ürün okuma; bot kullanma |
| `seller` | Kendi mağazasının tüm verisi; ürün CRUD; sipariş yönetim; chat (kendi müşterileri) |
| `admin` | Tüm satıcı/ürün/sipariş erişimi (read); başvuru onay; kategori; dispute; müşteri destek |
| `super_admin` | Tam erişim; sistem ayarları; admin kullanıcı yönetimi; KVKK silme |

### 3.2. Resource-Level

- `seller` sadece kendi `seller_id`'sine ait kaynakları görür/yönetir (RLS + guard)
- `customer` sadece kendi `user_id`'sine ait kaynakları görür
- `admin` cross-tenant okuyabilir AMA endpoint path'i bunu reflect etmeli: `/v1/admin/sellers/:id/products` (Implicit değil explicit)

### 3.3. Field-Level

- IBAN, TC kimlik, tax_id → admin bile direkt göremez (masked: `TR**********1234`)
- Tam görmek için audit log'a düşen "reveal" aksiyonu (`POST /admin/sellers/:id/reveal-iban`)

### 3.4. Guards (NestJS)

```ts
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles('seller')
@RequireOwnership('product') // checks seller_id matches
@Post('products/:id/discounts')
addDiscount(...) { ... }
```

---

## 4. Multi-Tenant İzolasyon (RLS)

### 4.1. Üç Katman Koruma

1. **App seviyesi**: Repository'lerde `seller_id` parametresi zorunlu
2. **DB seviyesi**: Postgres RLS policy `seller_id = current_setting('app.current_seller_id')`
3. **Test seviyesi**: Her PR'da tenant-isolation testleri çalışır

### 4.2. Request Context Set Etmek

Her HTTP request:

```ts
// TenantContextMiddleware
async use(req, res, next) {
  const session = await getSession(req);
  await db.execute(sql`
    SET LOCAL app.current_user_id = ${session?.userId ?? 'NULL'};
    SET LOCAL app.current_seller_id = ${session?.sellerId ?? 'NULL'};
    SET LOCAL app.current_role = ${session?.role ?? 'guest'};
  `);
  next();
}
```

### 4.3. Tenant Isolation Tests

```ts
describe('Multi-tenant isolation', () => {
  it('seller A cannot read seller B products', async () => {
    const a = await loginAsSeller('a');
    const productB = await createProductAsSeller('b', { name: 'X' });
    const res = await request(app).get(`/v1/seller/products/${productB.id}`).set('Auth', a);
    expect(res.status).toBe(404); // RLS empti döner, 404 gelir
  });
});
```

CI'da her PR'da koşar.

### 4.4. Cache Key'lerinde Tenant

Asla `cache:products:list` değil → `cache:products:seller:${sellerId}:list`.

---

## 5. Encryption

### 5.1. At-Rest

| Veri | Şifreleme |
|---|---|
| Şifre | Argon2id hash |
| 2FA secret | AES-256-GCM (server-side key) |
| Refresh token | SHA-256 hash (DB'de hash saklanır) |
| TC kimlik | AES-256-GCM |
| IBAN | AES-256-GCM |
| Tax ID | AES-256-GCM |
| Belge URL'leri | URL kendisi şifrelenmez ama bucket private + presigned URL |
| DB encryption (file-level) | Postgres-level: TDE yerine LUKS disk encryption + backup encryption |
| Backup'lar | gzip + GPG (asymmetric key) |

**Encryption key yönetimi:**
- `ENCRYPTION_KEY` env var, 32 byte base64
- Key rotation politikası: yılda 1 kez (yeni key oluştur, eski key ile decrypt → yeni ile encrypt)
- Production key'i sadece deploy sunucusunda, secrets manager'da

### 5.2. In-Transit

- **TLS 1.3** zorunlu (Caddy otomatik)
- **HSTS**: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- **Certificate pinning** (mobile app — Expo'da `expo-network-add-ons`)
- **Internal traffic**: Docker network içi de TLS (Caddy → NestJS) — Postgres bağlantı `sslmode=require`

### 5.3. Field Masking

Frontend'e dönen response'larda PII alanlar masklı:

```ts
function maskIban(iban: string): string {
  return iban.replace(/^(TR\d{2})\d{16}(\d{4})$/, '$1**********$2');
}
```

---

## 6. Audit Log

### 6.1. Ne Loglanır

Admin aksiyonları (`super_admin`, `admin`):
- Satıcı başvuru onay/red
- Satıcı askıya alma / kapatma
- Kategori onay/red/birleştir
- Dispute karar
- Kupon CRUD
- Ürün gizleme
- KVKK talebi işlem
- Sistem ayarı değişikliği
- Bildirim şablonu değişikliği
- Komisyon oran değişikliği
- IBAN/TC reveal action

Satıcı aksiyonları (security-sensitive):
- 2FA enable/disable
- Şifre değişikliği
- IBAN değişikliği
- Mağaza adı değişikliği

### 6.2. Audit Log Yapısı

```ts
{
  actor_user_id, actor_role, actor_ip, actor_user_agent,
  action: 'seller.approve',
  target_type: 'seller_application',
  target_id: '01HX...',
  before_data: { status: 'pending' },
  after_data: { status: 'approved', approved_at: ... },
  metadata: { reason: '...' },
  created_at
}
```

### 6.3. Audit Log Korunması

- **Append-only**: UPDATE / DELETE policy DENY (RLS)
- **Partition + arşiv**: 12 ay aktif, sonra arşive
- **Yasal saklama**: 10 yıl (TR ticari kayıtlar)
- **Tamper detection**: cryptographic chain (her satır = prev_hash + content → hash)

### 6.4. Audit Viewer (Super Admin)

- Filter: actor, action, target type, tarih aralığı
- Read-only
- Export: CSV (KVKK uyumlu — PII'lar maskli)

---

## 7. Rate Limiting

### 7.1. Katmanlar

1. **Caddy**: IP başına saniyede 100 req üst sınırı
2. **App seviyesi (NestJS)**: Redis sliding window + role-based limit
3. **Endpoint-spesifik**: bkz. [API.md](API.md#16-rate-limit)

### 7.2. DDoS Hazırlık

- Caddy → Cloudflare/BunnyCDN front (ileride) → Hedef sunucu
- WAF rules: SQL injection pattern, XSS pattern blok
- Anomaly detection: aniden 10x traffic → otomatik scale + alert

---

## 8. CSP (Content Security Policy)

```
Content-Security-Policy: default-src 'self';
  script-src 'self' 'wasm-unsafe-eval' https://www.iyzipay.com https://www.iyzico.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://storage.yorecebimde.com;
  font-src 'self' data:;
  connect-src 'self' https://api.yorecebimde.com wss://ws.yorecebimde.com;
  frame-src https://www.iyzipay.com https://sandbox-static-cdn.iyzipay.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
```

`unsafe-inline` style için Tailwind'in inline class'ı kabul edilir; `unsafe-inline` script ASLA.

## 9. CORS

```
Allow-Origin: https://yorecebimde.com, https://www.yorecebimde.com
Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Allow-Headers: Authorization, Content-Type, X-Request-Id, Accept-Language
Allow-Credentials: true
Max-Age: 3600
```

Mobile origin → CORS yok (native HTTP), JWT auth ile.

## 10. File Upload Güvenlik

- **MIME type check**: hem header hem magic byte (Sharp + file-type lib)
- **Size limit**: profil foto 5MB, ürün foto 10MB, belge 25MB
- **Virus scan**: ClamAV daemon (BullMQ job, upload sonrası)
- **Presigned upload**: app NestJS'ten presigned URL üretir (write-only, 10 dk TTL, IP bound) → kullanıcı direkt MinIO'ya yükler
- **Path traversal önleme**: filename hash + uuid (kullanıcı filename hiç dosya path'inde kullanılmaz)

## 11. AI Bot Güvenlik

- **Prompt injection önleme**: kullanıcı mesajı içine `<user_message>...</user_message>` tag'iyle sarılır, function output ayrı tag
- **Function call whitelist**: sadece tanımlı function'lar çağrılabilir
- **Function response validation**: Gemini'ye dönen output Zod ile validate edilir
- **Rate limit**: 60 mesaj/saat/user
- **Cost limit**: kullanıcı başına aylık 1000 mesaj hard cap (admin değiştirir)
- **Sensitive action confirm**: `placeOrder` her zaman frontend'de modal ile final onay
- **Logging**: prompt + completion saklanmaz (privacy), ama function call audit log'a düşer

## 12. KVKK (6698)

### 12.1. Veri Sahibi Hakları

| Hak | Endpoint | Süre |
|---|---|---|
| Bilgi talep | KVKK form (`/kvkk/talep`) | 30 gün |
| Erişim | Hesabımdan veri indir (JSON export) | Anında |
| Düzeltme | Profilden / KVKK form | 30 gün |
| Silme (right to be forgotten) | KVKK form → super admin onay | 30 gün |
| Taşınabilirlik | Hesabımdan veri indir (JSON) | Anında |
| İtiraz | KVKK form | 30 gün |

### 12.2. Veri Silme (Right to Be Forgotten)

**Sorun:** Sipariş kayıtlarını silmek yasal (vergi 5 yıl saklama) olarak yapamayız.

**Çözüm: Anonimleştirme**
- `users.first_name`, `last_name`, `email`, `phone` → `[REDACTED-<uuid>]`
- `addresses` → silinir (sipariş snapshot'larda zaten kopya var)
- `reviews` → "Bir kullanıcı" olarak görünür
- Audit log: silme işlemi loglanır
- Hard delete edilmeyen tablolar: orders, order_items, payments (yasal saklama)

### 12.3. Aydınlatma Metni

- Hesap açma formunda checkbox + popup link
- DB'ye kaydedilir: `users.kvkk_accepted_at`, versiyon bilgisi
- Versiyon değişirse → bir sonraki giriş tekrar onay

### 12.4. Açık Rıza (Marketing)

- **Ayrı** checkbox, default kapalı
- `marketing_email_opt_in`, `marketing_sms_opt_in` ayrı
- Tek tıkla unsubscribe (email footer, SMS DURDUR)

### 12.5. Veri Kategorileri ve Saklama

| Veri | Saklama |
|---|---|
| Hesap bilgileri | Hesap aktif olduğu sürece + silme talebi sonrası 30 gün |
| Sipariş kayıtları | 10 yıl (vergi) — anonimleştirilmiş şekilde |
| Iyzico transaction | 10 yıl |
| e-Fatura/e-Arşiv | 10 yıl |
| Audit log | 10 yıl |
| Chat mesajları | 2 yıl |
| Bildirim log | 1 yıl |
| Stok hareketleri | 5 yıl |
| Web analytics | 2 yıl anonim |

### 12.6. Veri İşleme Kayıtları

KVKK Madde 16: `etbis_records` tablosunda işleme amacı, hukuki sebep, veri kategorisi tutulur.

---

## 13. ETBİS

### 13.1. Kayıt

ETBİS portalına aracı hizmet sağlayıcı olarak kayıt:
- Şirket bilgileri
- Faaliyet alanı
- Hizmet sunulan iller
- Domain bilgisi

### 13.2. Bildirim Sistemi

- **Yeni satıcı eklendiğinde** ETBİS'e bildirim
- **Aylık özet** rapor
- **Şikayet durumunda** bildirim

NestJS `etbisModule` ile entegrasyon (API mevcut değilse e-Devlet üzerinden manuel — şimdilik manuel kabul, ileride otomatize).

---

## 14. Mesafeli Satış ve Tüketici

### 14.1. Sözleşme Üretimi

Her sipariş checkout'unda:
- **Ön Bilgilendirme Formu** (Madde 5)
- **Mesafeli Satış Sözleşmesi** (Madde 6)

Dinamik üretim:
- Sipariş bilgileri (satıcı, ürünler, fiyat, kargo)
- Cayma hakkı bildirimi (14 gün, gıda ürünleri için istisna kontrolü)
- Şikayet/itiraz mercii (Tüketici Hakem Heyeti / Tüketici Mahkemesi)

PDF üretim ve user paneline kaydedilir.

### 14.2. Cayma Hakkı İstisnaları

Gıda ürünleri için:
- Bozulabilir gıda → cayma hakkı yok (kullanıcıya checkout'ta açıkça uyarı)
- Bozulmayan gıda → 14 gün cayma hakkı

**UI:** Her ürünün `is_perishable` bayrağı var, sepete eklerken bildirilir.

---

## 15. Cookie Consent

- **Banner** ilk ziyarette
- Kategoriler:
  - **Zorunlu** (session, CSRF) — default açık, kapatılamaz
  - **Analytics** — opt-in
  - **Marketing** — opt-in
  - **Functional** (UI tercihleri) — opt-in
- LocalStorage'da consent state
- Settings sayfasında geri açılır

---

## 16. OWASP Top 10 Önlemleri

| Risk | Önlem |
|---|---|
| A01 Broken Access Control | Guards + RLS + isolation tests |
| A02 Cryptographic Failures | TLS 1.3 + AES-256-GCM PII + Argon2id şifre |
| A03 Injection | Drizzle parameterized + Zod validation |
| A04 Insecure Design | Threat model + ADR + security review |
| A05 Security Misconfiguration | Caddy + hardened headers + minimal Docker images |
| A06 Vulnerable Components | pnpm audit + Renovate + Snyk |
| A07 Identification/Auth Failures | Better-Auth + 2FA + rate limit + brute force lock |
| A08 Software & Data Integrity | SRI for CDN + signed builds + commit signing |
| A09 Security Logging Failures | Pino structured logs + Sentry + audit log |
| A10 SSRF | URL allowlist for outbound + DNS validation |

---

## 17. Penetration Test

Faz 7'de:
- External pentest (3rd party güvenlik firması)
- OWASP ZAP automated
- Manual review: business logic flaw (escrow, dispute manipülasyonu)
- Bug bounty (ileride)

---

## 18. Incident Response

### 18.1. Severity Levels

| Sev | Tanım | Yanıt süresi |
|---|---|---|
| SEV-1 | Veri sızıntısı, ödeme servisi ölü, sitenin tamamı down | 15 dk |
| SEV-2 | Tek bir kritik özellik down, partial veri sızıntısı | 1 saat |
| SEV-3 | Minor bug, performans düşüşü | 4 saat |
| SEV-4 | Cosmetic | İş günü |

### 18.2. Yanıt Adımları

1. **Detect** (Sentry alert, manuel rapor)
2. **Triage** (sev belirle, on-call'a haber ver)
3. **Mitigate** (bandage: feature flag kapat, geçici workaround)
4. **Fix** (root cause)
5. **Communicate** (kullanıcılara şeffaf duyuru gerekirse)
6. **Post-mortem** (blameless, 1 hafta içinde)

### 18.3. Data Breach Yanıtı (KVKK)

- 72 saat içinde KVK Kurumu'na bildirim
- Etkilenen kullanıcılara bildirim (email + dashboard)
- Public açıklama (gerekli ise)
- Şifre reset (etkilenen hesaplar)
- Audit + güvenlik patch

---

## 19. Security Headers

Caddy + Next.js + NestJS hepsi şu header'ları sunar:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=(self)
Content-Security-Policy: (bkz. §8)
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

---

## 20. Disaster Recovery (kısa özet — detay DEPLOYMENT.md)

- Backup: günlük full + WAL streaming → MinIO ayrı bucket + off-site B2
- Restore drill: 3 ayda bir
- RTO: 4 saat, RPO: 15 dk
- Sıcak yedek (gelecek): read replica ayrı VPS'te
