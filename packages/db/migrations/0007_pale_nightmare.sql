CREATE TYPE "public"."loyalty_tx_type" AS ENUM('earn', 'redeem', 'expire', 'refund_revoke', 'admin_adjust');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('pending', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."coupon_discount_type" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."question_status" AS ENUM('pending', 'answered', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('visible', 'hidden_by_admin', 'removed_by_user');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"lifetime_earned" integer DEFAULT 0 NOT NULL,
	"lifetime_redeemed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "loyalty_accounts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "loyalty_tx_type" NOT NULL,
	"points" integer NOT NULL,
	"order_id" uuid,
	"note" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral_codes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"code" varchar(16) NOT NULL,
	"total_redemptions" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "referral_codes_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referrals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"referrer_user_id" uuid NOT NULL,
	"referee_user_id" uuid NOT NULL,
	"code" varchar(16) NOT NULL,
	"status" "referral_status" DEFAULT 'pending' NOT NULL,
	"first_order_id" uuid,
	"rewarded_at" timestamp with time zone,
	"referee_ip" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupon_usages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"coupon_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" uuid,
	"discount_applied_cents" bigint NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"discount_type" "coupon_discount_type" NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"min_order_cents" bigint DEFAULT 0 NOT NULL,
	"max_discount_cents" bigint,
	"usage_limit" integer,
	"per_user_limit" integer DEFAULT 1 NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"applies_to" jsonb,
	"bound_user_id" uuid,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_questions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"answer" text,
	"answered_by" uuid,
	"answered_at" timestamp with time zone,
	"is_public" boolean DEFAULT true NOT NULL,
	"status" "question_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"body" text,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seller_reply" text,
	"seller_reply_at" timestamp with time zone,
	"status" "review_status" DEFAULT 'visible' NOT NULL,
	"hidden_reason" text,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_user_id_users_id_fk" FOREIGN KEY ("referee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referrals" ADD CONSTRAINT "referrals_first_order_id_orders_id_fk" FOREIGN KEY ("first_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupons" ADD CONSTRAINT "coupons_bound_user_id_users_id_fk" FOREIGN KEY ("bound_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_answered_by_users_id_fk" FOREIGN KEY ("answered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_tx_user_idx" ON "loyalty_transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_tx_expire_idx" ON "loyalty_transactions" USING btree ("expires_at") WHERE points > 0 AND type = 'earn';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referrals_referrer_idx" ON "referrals" USING btree ("referrer_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referrals_referee_idx" ON "referrals" USING btree ("referee_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_usages_coupon_user_idx" ON "coupon_usages" USING btree ("coupon_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_usages_order_idx" ON "coupon_usages" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupons_active_idx" ON "coupons" USING btree ("is_active","valid_until");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupons_bound_user_idx" ON "coupons" USING btree ("bound_user_id") WHERE bound_user_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_questions_product_public_idx" ON "product_questions" USING btree ("product_id","status") WHERE is_public = true AND status = 'answered';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_questions_seller_pending_idx" ON "product_questions" USING btree ("seller_id","status") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_reviews_product_idx" ON "product_reviews" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_reviews_seller_idx" ON "product_reviews" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_reviews_order_item_unique" ON "product_reviews" USING btree ("order_item_id");