CREATE TYPE "public"."match_onboarding_status" AS ENUM('not_started', 'in_progress', 'awaiting_review', 'complete');--> statement-breakpoint
CREATE TYPE "public"."match_presentation_status" AS ENUM('pending_review', 'queued', 'shown', 'accepted', 'declined', 'expired');--> statement-breakpoint
CREATE TABLE "match_presentations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"presented_to_id" uuid NOT NULL,
	"presented_user_id" uuid NOT NULL,
	"dossier_summary" text NOT NULL,
	"dossier_common_ground" text NOT NULL,
	"dossier_generative_difference" text NOT NULL,
	"conversation_starters" jsonb NOT NULL,
	"compatibility_score" numeric(4, 3),
	"status" "match_presentation_status" DEFAULT 'pending_review' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"shown_at" timestamp with time zone,
	"user_decision_at" timestamp with time zone,
	"feedback_score" integer,
	"feedback_comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_match_pres_pair" UNIQUE("presented_to_id","presented_user_id")
);
--> statement-breakpoint
CREATE TABLE "match_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"onboarding_status" "match_onboarding_status" DEFAULT 'not_started' NOT NULL,
	"onboarding_started_at" timestamp with time zone,
	"onboarding_completed_at" timestamp with time zone,
	"semantic_summary" text,
	"values_json" jsonb,
	"preferences_narrative" text,
	"public_narrative" text,
	"embedding" jsonb,
	"fit_vector" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "match_presentations" ADD CONSTRAINT "match_presentations_presented_to_id_users_id_fk" FOREIGN KEY ("presented_to_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_presentations" ADD CONSTRAINT "match_presentations_presented_user_id_users_id_fk" FOREIGN KEY ("presented_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_presentations" ADD CONSTRAINT "match_presentations_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_profiles" ADD CONSTRAINT "match_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_match_pres_to" ON "match_presentations" USING btree ("presented_to_id","status");