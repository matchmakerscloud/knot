CREATE TABLE "voice_fingerprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"embedding" jsonb NOT NULL,
	"embedding_dim" integer NOT NULL,
	"model" integer,
	"source_recording_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "voice_fingerprints" ADD CONSTRAINT "voice_fingerprints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_fingerprints" ADD CONSTRAINT "voice_fingerprints_source_recording_id_voice_recordings_id_fk" FOREIGN KEY ("source_recording_id") REFERENCES "public"."voice_recordings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_voice_fp_user" ON "voice_fingerprints" USING btree ("user_id");