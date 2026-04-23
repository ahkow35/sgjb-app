CREATE TYPE "public"."country" AS ENUM('SG', 'MY');--> statement-breakpoint
CREATE TYPE "public"."currency_type" AS ENUM('SGD', 'MYR');--> statement-breakpoint
CREATE TYPE "public"."store_type" AS ENUM('supermarket', 'pharmacy', 'petrol');--> statement-breakpoint
CREATE TYPE "public"."unit_type" AS ENUM('weight', 'each', 'volume');--> statement-breakpoint
CREATE TABLE "live_data" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" "currency_type" NOT NULL,
	"quantity" numeric(10, 3) DEFAULT '1' NOT NULL,
	"unit" text DEFAULT 'each' NOT NULL,
	"price_per_unit" numeric(10, 4),
	"submitted_by" uuid,
	"date_observed" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"brand" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"unit_type" "unit_type" NOT NULL,
	"barcode" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"country" "country" NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"type" "store_type" NOT NULL,
	"url" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "price_entries" ADD CONSTRAINT "price_entries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_entries" ADD CONSTRAINT "price_entries_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;