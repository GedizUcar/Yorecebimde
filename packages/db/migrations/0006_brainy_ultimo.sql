CREATE TYPE "public"."kvkk_request_status" AS ENUM('pending', 'in_progress', 'completed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."kvkk_request_type" AS ENUM('access', 'deletion', 'rectification', 'portability', 'objection');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kvkk_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"email" varchar(320) NOT NULL,
	"phone" varchar(20),
	"contact_name" varchar(200) NOT NULL,
	"type" "kvkk_request_type" NOT NULL,
	"request_text" text NOT NULL,
	"status" "kvkk_request_status" DEFAULT 'pending' NOT NULL,
	"handled_by" uuid,
	"handled_at" timestamp with time zone,
	"response" text,
	"reference_data" jsonb,
	"due_by" timestamp with time zone DEFAULT now() + interval '30 days' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trigger_key" varchar(100) NOT NULL,
	"channel" varchar(20) NOT NULL,
	"locale" varchar(5) DEFAULT 'tr' NOT NULL,
	"subject" varchar(300),
	"body" text NOT NULL,
	"is_active" text DEFAULT 'true' NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"is_secret" text DEFAULT 'false' NOT NULL,
	"category" varchar(50) NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "commission_rate_override" numeric(5, 2);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kvkk_requests" ADD CONSTRAINT "kvkk_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kvkk_requests" ADD CONSTRAINT "kvkk_requests_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kvkk_requests_status_idx" ON "kvkk_requests" USING btree ("status","due_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kvkk_requests_email_idx" ON "kvkk_requests" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_templates_unique" ON "notification_templates" USING btree ("trigger_key","channel","locale");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_settings_category_idx" ON "system_settings" USING btree ("category");