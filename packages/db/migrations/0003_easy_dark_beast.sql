CREATE TYPE "public"."cargo_mode" AS ENUM('self_managed', 'aras', 'mng', 'yurtici', 'ptt', 'integrated_other');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('created', 'pending_payment', 'paid', 'confirmed', 'preparing', 'shipped', 'delivered', 'completed', 'cancelled', 'return_requested', 'returned', 'refunded', 'disputed', 'resolved');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cart_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variation_id" uuid,
	"quantity" numeric(15, 3) NOT NULL,
	"unit_price_snapshot" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "carts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"device_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "carts_user_or_device_required" CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_reservations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(15, 3) NOT NULL,
	"user_id" uuid,
	"device_id" varchar(100),
	"cart_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"variation_id" uuid,
	"product_name_snapshot" varchar(300) NOT NULL,
	"variation_label_snapshot" varchar(100),
	"unit_snapshot" varchar(20) NOT NULL,
	"quantity" numeric(15, 3) NOT NULL,
	"unit_price_cents" bigint NOT NULL,
	"line_total_cents" bigint NOT NULL,
	"discount_cents" bigint DEFAULT 0 NOT NULL,
	"kdv_rate" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_no_seq" (
	"id" serial PRIMARY KEY NOT NULL,
	"year_val" integer NOT NULL,
	"last_no" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_no" varchar(30) NOT NULL,
	"user_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"shipping_address_id" uuid NOT NULL,
	"billing_address_id" uuid,
	"shipping_address_snapshot" jsonb NOT NULL,
	"billing_address_snapshot" jsonb,
	"status" "order_status" DEFAULT 'created' NOT NULL,
	"subtotal_cents" bigint NOT NULL,
	"discount_cents" bigint DEFAULT 0 NOT NULL,
	"shipping_cents" bigint DEFAULT 0 NOT NULL,
	"kdv_cents" bigint DEFAULT 0 NOT NULL,
	"total_cents" bigint NOT NULL,
	"commission_cents" bigint DEFAULT 0 NOT NULL,
	"seller_payout_cents" bigint DEFAULT 0 NOT NULL,
	"cargo_mode" "cargo_mode" DEFAULT 'self_managed' NOT NULL,
	"tracking_no" varchar(100),
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"payment_provider" varchar(50),
	"payment_ref" varchar(200),
	"paid_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "orders_order_no_unique" UNIQUE("order_no")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variation_id_product_variations_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."product_variations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variation_id_product_variations_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."product_variations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_address_id_addresses_id_fk" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_billing_address_id_addresses_id_fk" FOREIGN KEY ("billing_address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cart_items_cart_idx" ON "cart_items" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cart_items_product_idx" ON "cart_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cart_items_unique" ON "cart_items" USING btree ("cart_id","product_id","variation_id") WHERE variation_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cart_items_unique_no_var" ON "cart_items" USING btree ("cart_id","product_id") WHERE variation_id IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "carts_user_unique" ON "carts" USING btree ("user_id") WHERE user_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "carts_device_unique" ON "carts" USING btree ("device_id") WHERE user_id IS NULL AND device_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "carts_updated_idx" ON "carts" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_reservations_product_idx" ON "stock_reservations" USING btree ("product_id","expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_reservations_cart_idx" ON "stock_reservations" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_seller_idx" ON "order_items" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_product_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "order_no_seq_year_unique" ON "order_no_seq" USING btree ("year_val");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_user_idx" ON "orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_seller_idx" ON "orders" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders" USING btree ("status","created_at");