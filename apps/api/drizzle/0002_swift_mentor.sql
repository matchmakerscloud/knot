CREATE TYPE "public"."voice_prompt_category" AS ENUM('mandatory', 'elective');--> statement-breakpoint
CREATE TYPE "public"."voice_recording_status" AS ENUM('processing', 'active', 'rejected', 'archived');--> statement-breakpoint
CREATE TABLE "voice_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"locale" text NOT NULL,
	"category" "voice_prompt_category" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_recordings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"prompt_id" uuid NOT NULL,
	"prompt_text_snapshot" text NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"encryption_key_id" text NOT NULL,
	"duration_seconds" numeric(4, 2) NOT NULL,
	"waveform_peaks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"transcript" text,
	"status" "voice_recording_status" DEFAULT 'processing' NOT NULL,
	"rejection_reason" text,
	"position" integer NOT NULL,
	"listened_count" integer DEFAULT 0 NOT NULL,
	"saved_count" integer DEFAULT 0 NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_voice_rec_user_pos" UNIQUE("user_id","position"),
	CONSTRAINT "voice_rec_duration_range" CHECK ("voice_recordings"."duration_seconds" BETWEEN 1 AND 30),
	CONSTRAINT "voice_rec_position_range" CHECK ("voice_recordings"."position" BETWEEN 1 AND 9)
);
--> statement-breakpoint
ALTER TABLE "voice_recordings" ADD CONSTRAINT "voice_recordings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_recordings" ADD CONSTRAINT "voice_recordings_prompt_id_voice_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."voice_prompts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_voice_prompts_active" ON "voice_prompts" USING btree ("locale","category","active");--> statement-breakpoint
CREATE INDEX "idx_voice_rec_active_user" ON "voice_recordings" USING btree ("user_id","status");