CREATE TYPE "public"."user_role" AS ENUM('customer', 'seller', 'admin', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."seller_status" AS ENUM('pending', 'approved', 'suspended', 'rejected', 'closed');--> statement-breakpoint
CREATE TYPE "public"."seller_type" AS ENUM('individual', 'company');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_two_factor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" text,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "addresses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"label" varchar(50) NOT NULL,
	"recipient_name" varchar(200) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"country" varchar(2) DEFAULT 'TR' NOT NULL,
	"province" varchar(100) NOT NULL,
	"district" varchar(100) NOT NULL,
	"neighborhood" varchar(200),
	"postal_code" varchar(10),
	"address_line" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_billing" boolean DEFAULT false NOT NULL,
	"tc_kimlik_encrypted" text,
	"tax_id_encrypted" text,
	"tax_office" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(20),
	"phone_verified" boolean DEFAULT false NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"preferred_locale" varchar(5) DEFAULT 'tr',
	"marketing_email_opt_in" boolean DEFAULT false NOT NULL,
	"marketing_sms_opt_in" boolean DEFAULT false NOT NULL,
	"kvkk_accepted_at" timestamp with time zone,
	"kvkk_version_accepted" varchar(20),
	"last_login_at" timestamp with time zone,
	"two_fa_enabled" boolean DEFAULT false NOT NULL,
	"two_fa_secret_encrypted" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seller_applications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"contact_name" varchar(200) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"type" "seller_type" NOT NULL,
	"legal_name" varchar(300),
	"tax_id_encrypted" text,
	"iban_encrypted" text NOT NULL,
	"tc_kimlik_encrypted" text,
	"trade_registry_no" varchar(50),
	"food_business_reg_no" varchar(50),
	"documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"invite_token" text,
	"invite_token_expires_at" timestamp with time zone,
	"seller_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "seller_applications_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seller_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"seller_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"url" text NOT NULL,
	"uploaded_by" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sellers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"slug" varchar(100) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"type" "seller_type" NOT NULL,
	"legal_name" varchar(300),
	"tax_id_encrypted" text,
	"tax_office" varchar(200),
	"tc_kimlik_encrypted" text,
	"trade_registry_no" varchar(50),
	"iban_encrypted" text NOT NULL,
	"iyzico_submerchant_id" varchar(100),
	"iyzico_submerchant_type" varchar(50),
	"status" "seller_status" DEFAULT 'pending' NOT NULL,
	"bio" text,
	"logo_url" text,
	"cover_url" text,
	"working_hours" jsonb,
	"food_business_reg_no" varchar(50),
	"food_business_reg_doc_url" text,
	"contact_email" varchar(320) NOT NULL,
	"contact_phone" varchar(20) NOT NULL,
	"address_country" varchar(2) DEFAULT 'TR' NOT NULL,
	"address_province" varchar(100),
	"address_district" varchar(100),
	"address_full" text,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"rejection_reason" text,
	"rating_avg" numeric(3, 2) DEFAULT '0.00' NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"total_sales_count" integer DEFAULT 0 NOT NULL,
	"total_gmv" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "sellers_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "sellers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_user_id" uuid,
	"actor_role" "user_role",
	"actor_ip" "inet",
	"actor_user_agent" text,
	"action" varchar(100) NOT NULL,
	"target_type" varchar(50),
	"target_id" uuid,
	"before_data" jsonb,
	"after_data" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth_two_factor" ADD CONSTRAINT "auth_two_factor_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_auth_user_id_auth_user_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "seller_applications" ADD CONSTRAINT "seller_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "seller_applications" ADD CONSTRAINT "seller_applications_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "seller_documents" ADD CONSTRAINT "seller_documents_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "seller_documents" ADD CONSTRAINT "seller_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sellers" ADD CONSTRAINT "sellers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sellers" ADD CONSTRAINT "sellers_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "addresses_user_idx" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_active_idx" ON "users" USING btree ("email") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seller_applications_status_idx" ON "seller_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seller_applications_email_idx" ON "seller_applications" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seller_documents_seller_idx" ON "seller_documents" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sellers_status_idx" ON "sellers" USING btree ("status") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sellers_slug_idx" ON "sellers" USING btree ("slug") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_target_idx" ON "audit_logs" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" USING btree ("action","created_at");