ALTER TABLE "voice_recordings" ADD COLUMN "encryption_iv" text;--> statement-breakpoint
ALTER TABLE "voice_recordings" ADD COLUMN "encryption_auth_tag" text;--> statement-breakpoint
ALTER TABLE "voice_recordings" ADD COLUMN "encryption_wrapped_key" text;