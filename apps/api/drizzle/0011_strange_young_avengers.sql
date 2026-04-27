ALTER TABLE "waitlist_signups" ADD COLUMN "drip_step" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "drip_last_sent_at" timestamp with time zone;