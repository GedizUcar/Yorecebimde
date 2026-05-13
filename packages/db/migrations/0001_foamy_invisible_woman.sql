CREATE TYPE "public"."measurement_unit" AS ENUM('kg', 'g', 'lt', 'ml', 'adet', 'paket', 'kasa', 'demet', 'tane');--> statement-breakpoint
CREATE TYPE "public"."variation_mode" AS ENUM('none', 'discrete', 'stepper');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('permanent', 'time_based', 'quantity_based');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('initial', 'sale', 'refund', 'manual_increase', 'manual_decrease', 'correction');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"parent_id" uuid,
	"slug" varchar(150) NOT NULL,
	"name_tr" varchar(200) NOT NULL,
	"name_en" varchar(200),
	"description_tr" text,
	"description_en" text,
	"icon_url" text,
	"cover_url" text,
	"default_kdv_rate" numeric(5, 2) DEFAULT '8.00' NOT NULL,
	"default_commission_rate" numeric(5, 2) DEFAULT '10.00' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "category_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"seller_id" uuid NOT NULL,
	"proposed_name_tr" varchar(200) NOT NULL,
	"proposed_name_en" varchar(200),
	"proposed_parent_id" uuid,
	"reason" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"resulting_category_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_categories" (
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_images" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"url" text NOT NULL,
	"webp_url" text,
	"thumbnail_url" text,
	"alt_text" varchar(300),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"width" integer,
	"height" integer,
	"file_size_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_variations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"label" varchar(100) NOT NULL,
	"quantity" numeric(15, 3) NOT NULL,
	"price_override" numeric(15, 2),
	"sku" varchar(100),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"seller_id" uuid NOT NULL,
	"slug" varchar(200) NOT NULL,
	"name_tr" varchar(300) NOT NULL,
	"name_en" varchar(300),
	"description_tr" text,
	"description_en" text,
	"short_description_tr" varchar(500),
	"short_description_en" varchar(500),
	"unit" "measurement_unit" NOT NULL,
	"variation_mode" "variation_mode" DEFAULT 'none' NOT NULL,
	"stepper_min" numeric(15, 3),
	"stepper_max" numeric(15, 3),
	"stepper_step" numeric(15, 3),
	"base_unit_price" numeric(15, 2) NOT NULL,
	"kdv_rate" numeric(5, 2) NOT NULL,
	"kdv_included" boolean DEFAULT true NOT NULL,
	"is_cold_chain" boolean DEFAULT false NOT NULL,
	"weight_grams" integer,
	"stock_quantity" numeric(15, 3) DEFAULT '0' NOT NULL,
	"low_stock_threshold" numeric(15, 3),
	"low_stock_notify" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"rating_avg" numeric(3, 2) DEFAULT '0.00' NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"sales_count" integer DEFAULT 0 NOT NULL,
	"meta_title" varchar(200),
	"meta_description" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"type" "discount_type" NOT NULL,
	"percentage" numeric(5, 2),
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"tiers" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_movements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"quantity_delta" numeric(15, 3) NOT NULL,
	"quantity_after" numeric(15, 3) NOT NULL,
	"reason" text,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"performed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wishlists" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"device_id" varchar(100),
	"product_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishlists_user_or_device_required" CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "category_requests" ADD CONSTRAINT "category_requests_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "category_requests" ADD CONSTRAINT "category_requests_proposed_parent_id_categories_id_fk" FOREIGN KEY ("proposed_parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "category_requests" ADD CONSTRAINT "category_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "category_requests" ADD CONSTRAINT "category_requests_resulting_category_id_categories_id_fk" FOREIGN KEY ("resulting_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_images" ADD CONSTRAINT "product_images_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_variations" ADD CONSTRAINT "product_variations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_variations" ADD CONSTRAINT "product_variations_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discounts" ADD CONSTRAINT "discounts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discounts" ADD CONSTRAINT "discounts_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_active_idx" ON "categories" USING btree ("is_active") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_path_idx" ON "categories" USING btree ("path");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "category_requests_status_idx" ON "category_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "category_requests_seller_idx" ON "category_requests" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_categories_pk" ON "product_categories" USING btree ("product_id","category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_categories_category_idx" ON "product_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_categories_seller_idx" ON "product_categories" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_images_product_idx" ON "product_images" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_images_seller_idx" ON "product_images" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_variations_product_idx" ON "product_variations" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_variations_seller_idx" ON "product_variations" USING btree ("seller_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "products_seller_slug_unique" ON "products" USING btree ("seller_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_seller_idx" ON "products" USING btree ("seller_id","created_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_active_idx" ON "products" USING btree ("is_active","created_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_stock_idx" ON "products" USING btree ("seller_id","stock_quantity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_rating_idx" ON "products" USING btree ("rating_avg","rating_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discounts_product_active_idx" ON "discounts" USING btree ("product_id") WHERE is_active = true AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discounts_seller_idx" ON "discounts" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discounts_time_active_idx" ON "discounts" USING btree ("starts_at","ends_at") WHERE type = 'time_based' AND is_active = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_movements_product_idx" ON "stock_movements" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_movements_seller_idx" ON "stock_movements" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wishlists_user_product_unique" ON "wishlists" USING btree ("user_id","product_id") WHERE user_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wishlists_device_product_unique" ON "wishlists" USING btree ("device_id","product_id") WHERE user_id IS NULL AND device_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wishlists_product_idx" ON "wishlists" USING btree ("product_id");