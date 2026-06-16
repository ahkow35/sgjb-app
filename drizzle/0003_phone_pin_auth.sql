-- Phone + PIN auth overhaul. Email login removed; email kept optional/nullable.
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "login_attempts" (
  "phone_number" text PRIMARY KEY NOT NULL,
  "failed_count" integer DEFAULT 0 NOT NULL,
  "locked_until" timestamp,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
