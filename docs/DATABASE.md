# DATABASE — Yörecebimde

> Veri modeli, multi-tenant izolasyon (RLS), partitioning stratejisi, indexler, migration disiplini.

---

## 1. Genel Prensipler

- **PostgreSQL 16+**
- **Drizzle ORM** (TypeScript schema, migration üretimi `drizzle-kit`)
- Tüm tablolar `snake_case`, plural (`products`, `order_items`)
- Tüm tablolarda `id` (UUID v7), `created_at`, `updated_at`, `deleted_at` (soft delete)
- Multi-tenant sütun: `seller_id` (UUID FK)
- **Row Level Security (RLS)** her tenant-scoped tabloda aktif
- **Soft delete** default; hard delete sadece KVKK silme talebi için (audit'le)
- Tarih sütunları `TIMESTAMPTZ` (UTC)
- Para sütunları `NUMERIC(15, 2)` (TL, 2 ondalık) — float ASLA
- UUID: `uuidv7()` (zaman sıralı, B-tree-friendly)

## 2. Multi-Tenant Stratejisi (Detay)

### 2.1. Tenant Scope Tabloları

Bu tablolarda `seller_id` sütunu zorunlu, RLS policy var:
- `products`
- `product_variations`
- `product_categories` (M2M)
- `discounts`
- `stock_movements`
- `seller_questions`
- `order_groups`
- `order_items`
- `seller_chats`
- `seller_messages`
- `seller_boosts`
- `seller_documents`
- `payouts`
- `seller_invoices`
- `seller_notifications`

### 2.2. Tenant-Free Tabloları

Bu tablolar global / multiple-tenant (admin görüyor):
- `categories` (paylaşılan kategori ağacı)
- `users` (alıcılar)
- `addresses`
- `carts` (kullanıcının sepeti — birden fazla satıcı içerebilir)
- `cart_items`
- `orders` (üst-sipariş; içinde order_groups var, her grup bir satıcıya ait)
- `payments` (Iyzico transaction)
- `coupons`
- `loyalty_points`
- `referrals`
- `customer_chats` (super admin ile)
- `customer_messages`
- `disputes`
- `audit_logs`
- `notification_templates`
- `system_settings`
- `kvkk_requests`
- `etbis_records`

### 2.3. RLS Policy Pattern

Her tenant-scoped tablo için:

```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Seller can only see/modify own rows
CREATE POLICY seller_isolation_select ON products
  FOR SELECT
  USING (
    seller_id = current_setting('app.current_seller_id', true)::uuid
    OR current_setting('app.current_role', true) = 'admin'
  );

CREATE POLICY seller_isolation_insert ON products
  FOR INSERT
  WITH CHECK (
    seller_id = current_setting('app.current_seller_id', true)::uuid
    OR current_setting('app.current_role', true) = 'admin'
  );

CREATE POLICY seller_isolation_update ON products
  FOR UPDATE
  USING (
    seller_id = current_setting('app.current_seller_id', true)::uuid
    OR current_setting('app.current_role', true) = 'admin'
  );

CREATE POLICY seller_isolation_delete ON products
  FOR DELETE
  USING (
    seller_id = current_setting('app.current_seller_id', true)::uuid
    OR current_setting('app.current_role', true) = 'admin'
  );
```

Public read (anonymous storefront) için ayrı policy:

```sql
CREATE POLICY public_read ON products
  FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);
```

### 2.4. NestJS Tarafında Context Set Etmek

Her HTTP request başında:

```ts
// AuthMiddleware veya RequestContextInterceptor
await db.execute(sql`
  SET LOCAL app.current_seller_id = ${ctx.user?.sellerId ?? '00000000-0000-0000-0000-000000000000'};
  SET LOCAL app.current_role = ${ctx.user?.role ?? 'guest'};
  SET LOCAL app.current_user_id = ${ctx.user?.id ?? '00000000-0000-0000-0000-000000000000'};
`);
```

`SET LOCAL` → sadece bu transaction için aktif, request bitince temizlenir.

## 3. Tablolar (Tam Şema)

### 3.1. Auth & Users

```sql
-- Better-Auth tablolarını kullanır (auth_users, auth_sessions, auth_accounts, vs.)
-- Kendi user tablomuz Better-Auth'a aşağıdaki gibi bağlanır.

CREATE TYPE user_role AS ENUM ('customer', 'seller', 'admin', 'super_admin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  auth_user_id UUID NOT NULL UNIQUE,  -- Better-Auth FK
  email VARCHAR(320) NOT NULL,
  phone VARCHAR(20),
  phone_verified BOOLEAN DEFAULT false,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role user_role NOT NULL DEFAULT 'customer',
  status user_status NOT NULL DEFAULT 'active',
  preferred_locale VARCHAR(5) DEFAULT 'tr',
  marketing_email_opt_in BOOLEAN DEFAULT false,
  marketing_sms_opt_in BOOLEAN DEFAULT false,
  kvkk_accepted_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  two_fa_enabled BOOLEAN DEFAULT false,
  two_fa_secret_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX users_email_active_idx ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX users_role_idx ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX users_phone_idx ON users(phone) WHERE deleted_at IS NULL;

CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL,  -- "Ev", "İş"
  recipient_name VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  country VARCHAR(2) NOT NULL DEFAULT 'TR',
  province VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  neighborhood VARCHAR(200),
  postal_code VARCHAR(10),
  address_line TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_billing BOOLEAN DEFAULT false,
  tc_kimlik_encrypted TEXT,
  tax_id_encrypted TEXT,
  tax_office VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX addresses_user_idx ON addresses(user_id);
```

### 3.2. Sellers

```sql
CREATE TYPE seller_type AS ENUM ('individual', 'company');
CREATE TYPE seller_status AS ENUM ('pending', 'approved', 'suspended', 'rejected', 'closed');

CREATE TABLE sellers (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  user_id UUID UNIQUE REFERENCES users(id),  -- owner user
  slug VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  type seller_type NOT NULL,
  legal_name VARCHAR(300),
  tax_id_encrypted TEXT,
  tax_office VARCHAR(200),
  tc_kimlik_encrypted TEXT,             -- şahıs için
  trade_registry_no VARCHAR(50),        -- şirket için
  iban_encrypted TEXT NOT NULL,
  iyzico_submerchant_id VARCHAR(100),
  iyzico_submerchant_type VARCHAR(50),
  status seller_status NOT NULL DEFAULT 'pending',
  bio TEXT,
  logo_url TEXT,
  cover_url TEXT,
  working_hours JSONB,                   -- { mon: { open: "09:00", close: "18:00" }, ... }
  food_business_reg_no VARCHAR(50),      -- işletme kayıt belgesi
  food_business_reg_doc_url TEXT,
  contact_email VARCHAR(320) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  address_country VARCHAR(2) NOT NULL DEFAULT 'TR',
  address_province VARCHAR(100),
  address_district VARCHAR(100),
  address_full TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  rating_avg NUMERIC(3, 2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  total_sales_count INTEGER DEFAULT 0,
  total_gmv NUMERIC(15, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX sellers_status_idx ON sellers(status) WHERE deleted_at IS NULL;
CREATE INDEX sellers_slug_idx ON sellers(slug) WHERE deleted_at IS NULL;

CREATE TABLE seller_applications (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  email VARCHAR(320) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  contact_name VARCHAR(200) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  type seller_type NOT NULL,
  legal_name VARCHAR(300),
  tax_id_encrypted TEXT,
  iban_encrypted TEXT NOT NULL,
  tc_kimlik_encrypted TEXT,
  trade_registry_no VARCHAR(50),
  food_business_reg_no VARCHAR(50),
  documents JSONB NOT NULL,             -- [{ type: 'tax_certificate', url, uploaded_at }]
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending / approved / rejected / info_requested
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  invite_token TEXT UNIQUE,
  invite_token_expires_at TIMESTAMPTZ,
  seller_id UUID REFERENCES sellers(id),  -- if approved
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX seller_applications_status_idx ON seller_applications(status);
CREATE INDEX seller_applications_email_idx ON seller_applications(email);

CREATE TABLE seller_documents (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,            -- tax_certificate, signature_circular, identity, iban, food_business
  url TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX seller_documents_seller_idx ON seller_documents(seller_id);
```

### 3.3. Categories

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  parent_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
  slug VARCHAR(150) UNIQUE NOT NULL,
  name_tr VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  description_tr TEXT,
  description_en TEXT,
  icon_url TEXT,
  cover_url TEXT,
  default_kdv_rate NUMERIC(5, 2) NOT NULL DEFAULT 8.00,
  default_commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  depth INTEGER NOT NULL DEFAULT 0,
  path TEXT NOT NULL,                   -- "/gida/sut-urunleri/peynir"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX categories_parent_idx ON categories(parent_id);
CREATE INDEX categories_path_idx ON categories USING GIST (path gist_trgm_ops);
CREATE INDEX categories_active_idx ON categories(is_active) WHERE deleted_at IS NULL;

CREATE TABLE category_requests (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  proposed_name_tr VARCHAR(200) NOT NULL,
  proposed_name_en VARCHAR(200),
  proposed_parent_id UUID REFERENCES categories(id),
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending / approved / rejected / merged
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  resulting_category_id UUID REFERENCES categories(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX category_requests_status_idx ON category_requests(status);
```

### 3.4. Products

```sql
CREATE TYPE variation_mode AS ENUM ('none', 'discrete', 'stepper');
CREATE TYPE measurement_unit AS ENUM ('kg', 'g', 'lt', 'ml', 'adet', 'paket', 'kasa', 'demet', 'tane');

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  slug VARCHAR(200) NOT NULL,
  name_tr VARCHAR(300) NOT NULL,
  name_en VARCHAR(300),
  description_tr TEXT,
  description_en TEXT,
  short_description_tr VARCHAR(500),
  short_description_en VARCHAR(500),
  unit measurement_unit NOT NULL,
  variation_mode variation_mode NOT NULL DEFAULT 'none',
  stepper_min NUMERIC(15, 3),
  stepper_max NUMERIC(15, 3),
  stepper_step NUMERIC(15, 3),
  base_unit_price NUMERIC(15, 2) NOT NULL,
  kdv_rate NUMERIC(5, 2) NOT NULL,
  kdv_included BOOLEAN NOT NULL DEFAULT true,
  is_cold_chain BOOLEAN DEFAULT false,
  weight_grams INTEGER,                  -- kargo hesabı
  stock_quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC(15, 3),
  low_stock_notify BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  rating_avg NUMERIC(3, 2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  meta_title VARCHAR(200),
  meta_description VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (seller_id, slug)
);

CREATE INDEX products_seller_idx ON products(seller_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX products_active_idx ON products(is_active, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX products_stock_idx ON products(seller_id, stock_quantity) WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX products_rating_idx ON products(rating_avg DESC, rating_count DESC) WHERE is_active = true AND deleted_at IS NULL;

CREATE TABLE product_variations (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES sellers(id),
  label VARCHAR(100) NOT NULL,           -- "1 kg", "2 kg"
  quantity NUMERIC(15, 3) NOT NULL,      -- 1.000, 2.000
  price_override NUMERIC(15, 2),         -- null ise base_unit_price * quantity
  sku VARCHAR(100),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX product_variations_product_idx ON product_variations(product_id);

CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES sellers(id),
  url TEXT NOT NULL,
  webp_url TEXT,
  thumbnail_url TEXT,
  alt_text VARCHAR(300),
  sort_order INTEGER DEFAULT 0,
  width INTEGER,
  height INTEGER,
  file_size_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX product_images_product_idx ON product_images(product_id);

CREATE TABLE product_categories (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES sellers(id),
  is_primary BOOLEAN DEFAULT false,
  PRIMARY KEY (product_id, category_id)
);

CREATE INDEX product_categories_category_idx ON product_categories(category_id);
```

### 3.5. Discounts

```sql
CREATE TYPE discount_type AS ENUM ('permanent', 'time_based', 'quantity_based');

CREATE TABLE discounts (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES sellers(id),
  type discount_type NOT NULL,
  percentage NUMERIC(5, 2),
  -- time_based
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  -- quantity_based: stored in tiers
  tiers JSONB,                          -- [{ min_quantity: 3, percentage: 10 }, { min_quantity: 10, percentage: 20 }]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX discounts_product_idx ON discounts(product_id) WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX discounts_time_active_idx ON discounts(starts_at, ends_at) WHERE type = 'time_based' AND is_active = true;
```

### 3.6. Stock Movements (Audit)

```sql
CREATE TYPE stock_movement_type AS ENUM ('initial', 'sale', 'refund', 'manual_increase', 'manual_decrease', 'correction');

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  product_id UUID NOT NULL REFERENCES products(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  type stock_movement_type NOT NULL,
  quantity_delta NUMERIC(15, 3) NOT NULL,  -- pozitif/negatif
  quantity_after NUMERIC(15, 3) NOT NULL,
  reason TEXT,
  reference_type VARCHAR(50),           -- 'order_item', 'manual', etc.
  reference_id UUID,
  performed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partitioning: aylık
CREATE INDEX stock_movements_product_idx ON stock_movements(product_id, created_at DESC);
```

### 3.7. Carts

```sql
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(100),               -- misafir için
  currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
  coupon_code VARCHAR(50),
  loyalty_points_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);

CREATE UNIQUE INDEX carts_user_idx ON carts(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX carts_device_idx ON carts(device_id) WHERE user_id IS NULL AND device_id IS NOT NULL;

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variation_id UUID REFERENCES product_variations(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  quantity NUMERIC(15, 3) NOT NULL,
  unit_price_snapshot NUMERIC(15, 2) NOT NULL,  -- sepete eklendiği anki fiyat
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cart_items_cart_idx ON cart_items(cart_id);
CREATE INDEX cart_items_seller_idx ON cart_items(seller_id);
```

### 3.8. Orders (Partitioned)

```sql
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'completed', 'cancelled', 'return_requested', 'returned', 'refunded', 'disputed', 'resolved');
CREATE TYPE shipping_mode AS ENUM ('self_managed', 'integrated_aras', 'integrated_mng', 'integrated_yurtici', 'integrated_ptt');

-- Üst sipariş (checkout başına 1)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  order_no VARCHAR(20) UNIQUE NOT NULL,         -- "YC-2026-0000001"
  user_id UUID NOT NULL REFERENCES users(id),
  billing_address_id UUID NOT NULL REFERENCES addresses(id),
  shipping_address_id UUID NOT NULL REFERENCES addresses(id),
  subtotal NUMERIC(15, 2) NOT NULL,
  shipping_total NUMERIC(15, 2) NOT NULL,
  discount_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  loyalty_discount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  coupon_discount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  kdv_total NUMERIC(15, 2) NOT NULL,
  total NUMERIC(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
  coupon_code VARCHAR(50),
  loyalty_points_used INTEGER DEFAULT 0,
  loyalty_points_earned INTEGER DEFAULT 0,
  payment_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Aylık partition'lar otomatik üretilir (BullMQ job)
CREATE TABLE orders_2026_05 PARTITION OF orders
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
-- ... vs.

CREATE INDEX orders_user_idx ON orders(user_id, created_at DESC);
CREATE INDEX orders_order_no_idx ON orders(order_no);

-- Satıcı bazında alt-sipariş (her satıcı için ayrı)
CREATE TABLE order_groups (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  order_id UUID NOT NULL REFERENCES orders(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  status order_status NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(15, 2) NOT NULL,
  shipping_fee NUMERIC(15, 2) NOT NULL,
  discount_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  kdv_total NUMERIC(15, 2) NOT NULL,
  total NUMERIC(15, 2) NOT NULL,
  commission_rate NUMERIC(5, 2) NOT NULL,
  commission_amount NUMERIC(15, 2) NOT NULL,
  payout_amount NUMERIC(15, 2) NOT NULL,         -- total - commission
  shipping_mode shipping_mode NOT NULL,
  shipping_tracking_no VARCHAR(100),
  shipping_label_url TEXT,
  is_cold_chain BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  escrow_release_at TIMESTAMPTZ,                  -- delivered_at + 14 days
  payout_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX order_groups_order_idx ON order_groups(order_id);
CREATE INDEX order_groups_seller_status_idx ON order_groups(seller_id, status, created_at DESC);
CREATE INDEX order_groups_escrow_idx ON order_groups(escrow_release_at) WHERE status = 'delivered';

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  order_group_id UUID NOT NULL REFERENCES order_groups(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variation_id UUID REFERENCES product_variations(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  -- Ürün snapshot (geçmişte fiyat/isim değişse de sipariş net görünür)
  product_name_snapshot VARCHAR(300) NOT NULL,
  product_unit_snapshot measurement_unit NOT NULL,
  variation_label_snapshot VARCHAR(100),
  unit_price_snapshot NUMERIC(15, 2) NOT NULL,
  quantity NUMERIC(15, 3) NOT NULL,
  subtotal NUMERIC(15, 2) NOT NULL,
  discount_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  kdv_rate_snapshot NUMERIC(5, 2) NOT NULL,
  kdv_amount NUMERIC(15, 2) NOT NULL,
  total NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX order_items_group_idx ON order_items(order_group_id);
CREATE INDEX order_items_seller_idx ON order_items(seller_id, created_at DESC);
```

### 3.9. Payments

```sql
CREATE TYPE payment_status AS ENUM ('initiated', 'pending_3ds', 'success', 'failed', 'refunded', 'partial_refund');

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  order_id UUID NOT NULL REFERENCES orders(id),
  user_id UUID NOT NULL REFERENCES users(id),
  provider VARCHAR(50) NOT NULL DEFAULT 'iyzico',
  provider_payment_id VARCHAR(200),
  provider_conversation_id VARCHAR(200),
  status payment_status NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
  refunded_amount NUMERIC(15, 2) DEFAULT 0,
  installment_count INTEGER DEFAULT 1,
  card_last_four VARCHAR(4),
  card_brand VARCHAR(20),
  ip_address INET,
  user_agent TEXT,
  raw_response JSONB,                   -- Iyzico raw response (debug)
  failed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payments_order_idx ON payments(order_id);
CREATE INDEX payments_status_idx ON payments(status);

CREATE TABLE payment_refunds (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  order_group_id UUID REFERENCES order_groups(id),
  amount NUMERIC(15, 2) NOT NULL,
  reason TEXT NOT NULL,
  provider_refund_id VARCHAR(200),
  status VARCHAR(20) NOT NULL,
  initiated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payment_refunds_payment_idx ON payment_refunds(payment_id);

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  order_group_id UUID NOT NULL REFERENCES order_groups(id),
  amount NUMERIC(15, 2) NOT NULL,
  commission_amount NUMERIC(15, 2) NOT NULL,
  provider_payout_id VARCHAR(200),
  status VARCHAR(20) NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  failed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payouts_seller_idx ON payouts(seller_id, created_at DESC);
CREATE INDEX payouts_scheduled_idx ON payouts(scheduled_at) WHERE status = 'pending';
```

### 3.10. Disputes

```sql
CREATE TYPE dispute_status AS ENUM ('open', 'seller_responded', 'escalated', 'resolved_customer', 'resolved_seller', 'auto_refunded');

CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  order_group_id UUID NOT NULL REFERENCES order_groups(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  customer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  reason VARCHAR(50) NOT NULL,          -- 'damaged', 'wrong_item', 'late_delivery', 'changed_mind', 'other'
  description TEXT,
  customer_evidence JSONB,              -- [{ type: 'photo', url }]
  seller_response TEXT,
  seller_evidence JSONB,
  admin_decision TEXT,
  admin_decided_by UUID REFERENCES users(id),
  admin_decided_at TIMESTAMPTZ,
  status dispute_status NOT NULL DEFAULT 'open',
  seller_response_due_at TIMESTAMPTZ NOT NULL,
  auto_escalate_at TIMESTAMPTZ,
  refund_amount NUMERIC(15, 2),
  return_shipping_fee NUMERIC(15, 2),
  return_shipping_paid_by VARCHAR(20),  -- 'seller' or 'customer'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX disputes_order_group_idx ON disputes(order_group_id);
CREATE INDEX disputes_seller_status_idx ON disputes(seller_id, status, created_at DESC);
CREATE INDEX disputes_response_due_idx ON disputes(seller_response_due_at) WHERE status = 'open';
CREATE INDEX disputes_escalate_idx ON disputes(auto_escalate_at) WHERE status IN ('open', 'seller_responded');
```

### 3.11. Reviews & Q&A

```sql
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  product_id UUID NOT NULL REFERENCES products(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  user_id UUID NOT NULL REFERENCES users(id),
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(200),
  body TEXT,
  photos JSONB,                         -- [{ url }]
  is_verified_purchase BOOLEAN DEFAULT true,
  seller_reply TEXT,
  seller_replied_at TIMESTAMPTZ,
  is_hidden BOOLEAN DEFAULT false,
  hidden_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_item_id, user_id)
);

CREATE INDEX product_reviews_product_idx ON product_reviews(product_id, created_at DESC);
CREATE INDEX product_reviews_seller_idx ON product_reviews(seller_id, created_at DESC);
CREATE INDEX product_reviews_rating_idx ON product_reviews(product_id, rating);

CREATE TABLE product_questions (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  product_id UUID NOT NULL REFERENCES products(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  asker_user_id UUID NOT NULL REFERENCES users(id),
  question TEXT NOT NULL,
  answer TEXT,
  answered_at TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT false,      -- satıcı yayınla der
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX product_questions_product_idx ON product_questions(product_id, created_at DESC) WHERE is_public = true;
CREATE INDEX product_questions_seller_idx ON product_questions(seller_id, created_at DESC);
```

### 3.12. Chat

```sql
CREATE TYPE chat_thread_type AS ENUM ('order', 'direct_seller', 'support');

CREATE TABLE chat_threads (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  type chat_thread_type NOT NULL,
  customer_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES sellers(id),
  order_group_id UUID REFERENCES order_groups(id),
  last_message_at TIMESTAMPTZ,
  customer_unread_count INTEGER DEFAULT 0,
  seller_unread_count INTEGER DEFAULT 0,
  admin_unread_count INTEGER DEFAULT 0,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX chat_threads_customer_idx ON chat_threads(customer_id, last_message_at DESC);
CREATE INDEX chat_threads_seller_idx ON chat_threads(seller_id, last_message_at DESC);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id),
  sender_role user_role NOT NULL,
  body TEXT,
  attachments JSONB,
  read_by JSONB DEFAULT '[]'::jsonb,    -- [{ user_id, read_at }]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_thread_idx ON chat_messages(thread_id, created_at DESC);
```

### 3.13. Boost

```sql
CREATE TABLE boost_packages (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  name_tr VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  duration_days INTEGER NOT NULL,
  price NUMERIC(15, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE seller_boosts (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  package_id UUID NOT NULL REFERENCES boost_packages(id),
  amount_paid NUMERIC(15, 2) NOT NULL,
  payment_id UUID REFERENCES payments(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  impression_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX seller_boosts_active_idx ON seller_boosts(ends_at, is_active) WHERE is_active = true;
CREATE INDEX seller_boosts_product_idx ON seller_boosts(product_id) WHERE is_active = true;
```

### 3.14. Loyalty + Referral + Coupons

```sql
CREATE TABLE loyalty_points (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  user_id UUID NOT NULL REFERENCES users(id),
  balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX loyalty_points_user_idx ON loyalty_points(user_id);

CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  user_id UUID NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,              -- pozitif kazanma, negatif harcama
  type VARCHAR(50) NOT NULL,            -- 'order_earn', 'referral_earn', 'order_redeem', 'expired'
  reference_type VARCHAR(50),
  reference_id UUID,
  description TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX loyalty_transactions_user_idx ON loyalty_transactions(user_id, created_at DESC);

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  referrer_user_id UUID NOT NULL REFERENCES users(id),
  referee_user_id UUID NOT NULL REFERENCES users(id),
  code VARCHAR(20) NOT NULL,
  first_order_id UUID REFERENCES orders(id),
  referrer_reward_points INTEGER,
  referee_reward_amount NUMERIC(15, 2),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending / completed
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX referrals_code_idx ON referrals(code);
CREATE INDEX referrals_referrer_idx ON referrals(referrer_user_id);

CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200),
  description TEXT,
  discount_type VARCHAR(20) NOT NULL,    -- 'percentage', 'fixed'
  discount_value NUMERIC(15, 2) NOT NULL,
  min_order_total NUMERIC(15, 2),
  max_discount_amount NUMERIC(15, 2),
  usage_limit_per_user INTEGER,
  total_usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  applies_to_category_ids JSONB,
  applies_to_seller_ids JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX coupons_code_idx ON coupons(code);
CREATE INDEX coupons_active_idx ON coupons(is_active, ends_at);

CREATE TABLE coupon_usages (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  coupon_id UUID NOT NULL REFERENCES coupons(id),
  user_id UUID NOT NULL REFERENCES users(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  discount_amount NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX coupon_usages_coupon_user_idx ON coupon_usages(coupon_id, user_id);
```

### 3.15. Wishlist

```sql
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(100),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);

CREATE UNIQUE INDEX wishlists_user_product_idx ON wishlists(user_id, product_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX wishlists_device_product_idx ON wishlists(device_id, product_id) WHERE user_id IS NULL;
```

### 3.16. Notifications

```sql
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  key VARCHAR(100) UNIQUE NOT NULL,     -- 'new_order_to_seller'
  channel VARCHAR(20) NOT NULL,         -- email, sms, push, in_app
  locale VARCHAR(5) NOT NULL,
  subject VARCHAR(500),
  body_template TEXT NOT NULL,          -- handlebars/mustache
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (key, channel, locale)
);

CREATE TABLE notifications_log (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  recipient_user_id UUID REFERENCES users(id),
  recipient_email VARCHAR(320),
  recipient_phone VARCHAR(20),
  channel VARCHAR(20) NOT NULL,
  template_key VARCHAR(100) NOT NULL,
  subject VARCHAR(500),
  body TEXT,
  provider VARCHAR(50),                 -- resend, netgsm, expo
  provider_message_id VARCHAR(200),
  status VARCHAR(20) NOT NULL,          -- queued, sent, delivered, failed, bounced
  failed_reason TEXT,
  metadata JSONB,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_log_recipient_idx ON notifications_log(recipient_user_id, created_at DESC);
CREATE INDEX notifications_log_status_idx ON notifications_log(status, created_at DESC);
```

### 3.17. Audit Log

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  actor_user_id UUID REFERENCES users(id),
  actor_role user_role,
  actor_ip INET,
  actor_user_agent TEXT,
  action VARCHAR(100) NOT NULL,         -- 'seller.approve', 'product.delete', 'dispute.resolve'
  target_type VARCHAR(50),              -- 'seller', 'product', 'dispute'
  target_id UUID,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Aylık partition'lar
CREATE TABLE audit_logs_2026_05 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE INDEX audit_logs_actor_idx ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX audit_logs_target_idx ON audit_logs(target_type, target_id, created_at DESC);
CREATE INDEX audit_logs_action_idx ON audit_logs(action, created_at DESC);
```

### 3.18. KVKK + ETBİS

```sql
CREATE TABLE kvkk_requests (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  user_id UUID REFERENCES users(id),
  email VARCHAR(320) NOT NULL,
  type VARCHAR(50) NOT NULL,            -- 'access', 'rectification', 'deletion', 'portability'
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX kvkk_requests_status_idx ON kvkk_requests(status);

CREATE TABLE etbis_records (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  data JSONB NOT NULL,
  reported_at TIMESTAMPTZ NOT NULL,
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.19. Settings + i18n

```sql
CREATE TABLE system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  is_secret BOOLEAN DEFAULT false,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE i18n_strings (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  namespace VARCHAR(50) NOT NULL,       -- 'email', 'sms', 'contract', 'ui'
  key VARCHAR(200) NOT NULL,
  locale VARCHAR(5) NOT NULL,
  value TEXT NOT NULL,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (namespace, key, locale)
);
```

## 4. Partition Stratejisi

### 4.1. Hangi Tablolar Partition Edilir?

| Tablo | Aralık | Sebep |
|---|---|---|
| `orders` | RANGE(created_at) — aylık | Zamanla milyonlarca kayıt |
| `order_items` | RANGE(created_at) — aylık | Aynı |
| `stock_movements` | RANGE(created_at) — aylık | Çok sık INSERT |
| `audit_logs` | RANGE(created_at) — aylık | Sıkı tutulması gereken log |
| `notifications_log` | RANGE(created_at) — aylık | Çok yüksek hacim |
| `chat_messages` | RANGE(created_at) — aylık | Konuşma hacmi büyür |
| `payments` | RANGE(created_at) — aylık | Finansal hacim |

### 4.2. Partition Otomasyon

`pg_partman` extension veya custom BullMQ cron job:

```sql
-- Her ayın 25'inde gelecek ayın partition'ını oluşturur
CREATE OR REPLACE FUNCTION create_next_month_partition(table_name TEXT) RETURNS void AS $$
DECLARE
  next_month DATE := date_trunc('month', now()) + interval '1 month';
  partition_name TEXT;
  start_date TEXT;
  end_date TEXT;
BEGIN
  partition_name := table_name || '_' || to_char(next_month, 'YYYY_MM');
  start_date := to_char(next_month, 'YYYY-MM-DD');
  end_date := to_char(next_month + interval '1 month', 'YYYY-MM-DD');

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    partition_name, table_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;
```

### 4.3. Eski Partition Arşivleme

- 12 aydan eski partition'lar → `pg_dump` ile MinIO'ya yedek → DROP
- Audit log için yasal saklama süresi (10 yıl) → arşiv bucket'ında zip
- Restore gerekirse: `CREATE TABLE ... ; pg_restore`

## 5. Index Stratejisi

### Genel Kurallar

- WHERE'de kullanılan tüm sütunlar için index düşün
- ORDER BY için composite index (WHERE + ORDER BY birlikte)
- Partial index: `WHERE deleted_at IS NULL`, `WHERE is_active = true`
- Soft delete olmayan sütunlar: covering index
- JSONB için GIN index (boost.click_count gibi sayısal alanlarda gerek yok)
- Çok-sütunlu unique constraint'leri index'ten ayır
- Foreign key'lerin TUM dimensionlarda index'i olmalı

### Kritik Composite Index'ler

```sql
-- En sık çalışan query'lere göre
CREATE INDEX products_listing_idx ON products(is_active, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX products_seller_listing_idx ON products(seller_id, is_active, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX products_category_listing_idx ON product_categories(category_id, product_id);

CREATE INDEX orders_user_recent_idx ON orders(user_id, created_at DESC);

CREATE INDEX order_groups_seller_pending_idx ON order_groups(seller_id, status, created_at DESC)
  WHERE status IN ('pending', 'confirmed', 'preparing');
```

## 6. Connection Pooling

- **PgBouncer** transaction mode
- App'ten gelen connection sayısı yüksek → PgBouncer pool 20, Postgres max 100
- `SET LOCAL` kullandığımız için **transaction mode** zorunlu (session mode da olur ama PgBouncer'da pool reuse için transaction mode iyi)
- Better-Auth gibi session state gerektiren araçlar için ayrı bağlantı/pool (eğer gerekirse statement timeout vs.)

## 7. Backup ve Restore

- **Full backup**: Günlük (gece 03:00) → `pg_dump --format=custom`
- **Incremental WAL**: `pg_basebackup` + `wal_level=replica` + sürekli arşivleme
- **Hedef**: MinIO ayrı bucket (`backups`)
- **Off-site**: Haftalık Backblaze B2 senkronizasyonu
- **Test restore**: 3 ayda bir staging'e restore test

## 8. Migration Disiplini

- Drizzle Kit ile migration üretilir: `pnpm db:generate`
- Her migration **idempotent** olmalı
- **Breaking change asla**: shadow column → backfill → swap → cleanup pattern
- Schema değişiklikleri her zaman ayrı PR + review
- Migration test: staging'de production verisinin bir kopyasında çalıştırılır

## 9. Performans Pratikleri

- **EXPLAIN ANALYZE** her yeni query için review
- `pg_stat_statements` aktif → yavaş query izleme
- **Materialized view** marketplace listing için (hot product list, kategori sayfası agregasyon)
- **Refresh policy**: marketplace MV → 5 dk'da bir
- **Vacuum/Analyze**: autovacuum + nightly `VACUUM ANALYZE`
- **Connection limit**: app başına 20, PgBouncer arkada

## 10. UUID v7 Notu

UUID v7 zaman sıralı: B-tree'de fragmentation yok, insert performance UUID v4'ten çok daha iyi. Postgres 16'da extension olarak veya app tarafında üretebiliyoruz. Tercih: **app tarafında** üret (NodeJS `uuidv7` paketi) — DB extension dependency yok.
