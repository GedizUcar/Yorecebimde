CREATE TYPE "public"."push_platform" AS ENUM('ios', 'android', 'web');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_push_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" "push_platform" NOT NULL,
	"device_label" varchar(100),
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_push_tokens" ADD CONSTRAINT "user_push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_push_tokens_user_idx" ON "user_push_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_push_tokens_token_unique" ON "user_push_tokens" USING btree ("token");