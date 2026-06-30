CREATE TYPE "public"."price_source" AS ENUM('manual', 'barcode', 'scraper', 'admin');--> statement-breakpoint
ALTER TABLE "price_entries" ADD COLUMN "source" "price_source" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
UPDATE "price_entries"
SET "source" = 'scraper'
WHERE "submitted_by" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_entries_submitted_by_idx" ON "price_entries" ("submitted_by");--> statement-breakpoint
