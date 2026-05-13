CREATE TYPE "public"."invoice_status" AS ENUM('pending', 'issued', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."invoice_type" AS ENUM('e_arsiv', 'e_fatura');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'sms', 'push', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('queued', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" "invoice_type" NOT NULL,
	"invoice_no" varchar(100),
	"order_id" uuid,
	"seller_id" uuid,
	"user_id" uuid,
	"gross_cents" text NOT NULL,
	"net_cents" text NOT NULL,
	"kdv_cents" text NOT NULL,
	"status" "invoice_status" DEFAULT 'pending' NOT NULL,
	"provider_ref" varchar(200),
	"pdf_url" text,
	"issued_at" timestamp with time zone,
	"error" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trigger_key" varchar(100) NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"recipient" varchar(320) NOT NULL,
	"user_id" uuid,
	"seller_id" uuid,
	"subject" varchar(300),
	"body" text NOT NULL,
	"context" jsonb,
	"status" "notification_status" DEFAULT 'queued' NOT NULL,
	"error" text,
	"provider_ref" varchar(200),
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_order_idx" ON "invoices" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_seller_idx" ON "invoices" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_log_status_idx" ON "notifications_log" USING btree ("status","queued_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_log_user_idx" ON "notifications_log" USING btree ("user_id","queued_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_log_seller_idx" ON "notifications_log" USING btree ("seller_id","queued_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_log_trigger_idx" ON "notifications_log" USING btree ("trigger_key","queued_at");