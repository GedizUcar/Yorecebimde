CREATE TYPE "public"."image_processing_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "storage_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "processing_status" "image_processing_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "processing_error" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_images_status_idx" ON "product_images" USING btree ("processing_status","created_at");