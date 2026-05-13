CREATE TYPE "public"."dispute_reason" AS ENUM('not_received', 'damaged', 'wrong_item', 'not_as_described', 'other');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('opened', 'seller_responded', 'escalated', 'resolved_customer', 'resolved_seller', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."chat_sender_role" AS ENUM('user', 'seller', 'system');--> statement-breakpoint
CREATE TYPE "public"."chat_thread_kind" AS ENUM('order', 'direct');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "disputes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"reason" "dispute_reason" NOT NULL,
	"customer_message" text NOT NULL,
	"customer_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seller_response" text,
	"seller_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "dispute_status" DEFAULT 'opened' NOT NULL,
	"auto_escalate_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"thread_id" uuid NOT NULL,
	"sender_role" "chat_sender_role" NOT NULL,
	"sender_user_id" uuid,
	"body" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_threads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" "chat_thread_kind" NOT NULL,
	"user_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"order_id" uuid,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unread_counts" jsonb DEFAULT '{"user":0,"seller":0}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boost_packages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"duration_days" integer NOT NULL,
	"price_cents" bigint NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seller_boosts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"seller_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"payment_ref" varchar(200),
	"paid_at" timestamp with time zone,
	"price_paid_cents" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disputes" ADD CONSTRAINT "disputes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disputes" ADD CONSTRAINT "disputes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disputes" ADD CONSTRAINT "disputes_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_thread_id_chat_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_threads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "seller_boosts" ADD CONSTRAINT "seller_boosts_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "seller_boosts" ADD CONSTRAINT "seller_boosts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "seller_boosts" ADD CONSTRAINT "seller_boosts_package_id_boost_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."boost_packages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "disputes_order_idx" ON "disputes" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "disputes_seller_idx" ON "disputes" USING btree ("seller_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "disputes_user_idx" ON "disputes" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "disputes_escalate_idx" ON "disputes" USING btree ("auto_escalate_at") WHERE status = 'seller_responded';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_thread_idx" ON "chat_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_threads_user_idx" ON "chat_threads" USING btree ("user_id","last_message_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_threads_seller_idx" ON "chat_threads" USING btree ("seller_id","last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_threads_order_unique" ON "chat_threads" USING btree ("order_id") WHERE kind = 'order';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_threads_direct_unique" ON "chat_threads" USING btree ("user_id","seller_id") WHERE kind = 'direct';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boost_packages_active_idx" ON "boost_packages" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seller_boosts_seller_idx" ON "seller_boosts" USING btree ("seller_id","ends_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seller_boosts_product_active_idx" ON "seller_boosts" USING btree ("product_id","starts_at","ends_at") WHERE cancelled_at IS NULL;