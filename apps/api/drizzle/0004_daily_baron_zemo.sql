CREATE TYPE "public"."chamber_app" AS ENUM('voice', 'words', 'match');--> statement-breakpoint
CREATE TYPE "public"."chamber_origin" AS ENUM('voice_match', 'words_match', 'match_presentation');--> statement-breakpoint
CREATE TYPE "public"."chamber_status" AS ENUM('active', 'archived', 'closed');--> statement-breakpoint
CREATE TYPE "public"."message_kind" AS ENUM('voice', 'text', 'photo', 'system');--> statement-breakpoint
CREATE TYPE "public"."voice_feed_action" AS ENUM('viewed', 'listened_partial', 'listened_full', 'saved', 'replied', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."voice_reply_status" AS ENUM('pending', 'replied_back', 'expired', 'declined');--> statement-breakpoint
CREATE TABLE "chamber_participants" (
	"chamber_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	"last_read_at" timestamp with time zone,
	CONSTRAINT "chamber_participants_chamber_id_user_id_pk" PRIMARY KEY("chamber_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "chambers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app" "chamber_app" NOT NULL,
	"origin" "chamber_origin" NOT NULL,
	"origin_ref_id" uuid,
	"status" "chamber_status" DEFAULT 'active' NOT NULL,
	"photo_unlock_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"text_unlock_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_observer_active" boolean DEFAULT false NOT NULL,
	"last_message_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chamber_id" uuid NOT NULL,
	"sender_id" uuid,
	"kind" "message_kind" NOT NULL,
	"body" text,
	"voice_storage_key" text,
	"voice_content_type" text,
	"voice_duration_seconds" numeric(4, 2),
	"voice_waveform_peaks" jsonb,
	"voice_transcript" text,
	"photo_storage_key" text,
	"reactions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"read_at_by" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_feed_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"recording_id" uuid NOT NULL,
	"action" "voice_feed_action" NOT NULL,
	"duration_listened_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"parent_recording_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"duration_seconds" numeric(4, 2) NOT NULL,
	"transcript" text,
	"status" "voice_reply_status" DEFAULT 'pending' NOT NULL,
	"chamber_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chamber_participants" ADD CONSTRAINT "chamber_participants_chamber_id_chambers_id_fk" FOREIGN KEY ("chamber_id") REFERENCES "public"."chambers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamber_participants" ADD CONSTRAINT "chamber_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chamber_id_chambers_id_fk" FOREIGN KEY ("chamber_id") REFERENCES "public"."chambers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_feed_events" ADD CONSTRAINT "voice_feed_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_feed_events" ADD CONSTRAINT "voice_feed_events_recording_id_voice_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."voice_recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_replies" ADD CONSTRAINT "voice_replies_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_replies" ADD CONSTRAINT "voice_replies_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_replies" ADD CONSTRAINT "voice_replies_parent_recording_id_voice_recordings_id_fk" FOREIGN KEY ("parent_recording_id") REFERENCES "public"."voice_recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chamber_part_user" ON "chamber_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_chambers_active" ON "chambers" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "idx_messages_chamber" ON "messages" USING btree ("chamber_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_vfe_user_recent" ON "voice_feed_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_vfe_recording" ON "voice_feed_events" USING btree ("recording_id");--> statement-breakpoint
CREATE INDEX "idx_voice_replies_to_status" ON "voice_replies" USING btree ("to_user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_voice_replies_from" ON "voice_replies" USING btree ("from_user_id","created_at");