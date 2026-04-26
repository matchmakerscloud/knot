CREATE TYPE "public"."waitlist_source" AS ENUM('umbrella', 'voice', 'words', 'match');--> statement-breakpoint
CREATE TYPE "public"."waitlist_status" AS ENUM('pending', 'confirmed', 'invited', 'unsubscribed');--> statement-breakpoint
CREATE TABLE "waitlist_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"source" "waitlist_source" NOT NULL,
	"locale" text DEFAULT 'es' NOT NULL,
	"confirm_token_hash" text,
	"status" "waitlist_status" DEFAULT 'pending' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"invited_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"referrer" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_waitlist_email" ON "waitlist_signups" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_waitlist_status" ON "waitlist_signups" USING btree ("status");