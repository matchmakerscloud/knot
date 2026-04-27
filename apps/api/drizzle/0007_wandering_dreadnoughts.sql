CREATE TYPE "public"."words_like_status" AS ENUM('pending', 'replied', 'expired', 'declined');--> statement-breakpoint
CREATE TYPE "public"."words_response_status" AS ENUM('draft', 'pending_review', 'active', 'rejected', 'archived');--> statement-breakpoint
CREATE TABLE "words_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"liker_id" uuid NOT NULL,
	"liked_user_id" uuid NOT NULL,
	"response_id" uuid NOT NULL,
	"comment" text NOT NULL,
	"status" "words_like_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone,
	"chamber_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_words_likes_liker_liked" UNIQUE("liker_id","liked_user_id"),
	CONSTRAINT "words_like_comment_length" CHECK (length("words_likes"."comment") >= 20)
);
--> statement-breakpoint
CREATE TABLE "words_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"category" text NOT NULL,
	"locale" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "words_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"prompt_id" uuid NOT NULL,
	"prompt_text_snapshot" text NOT NULL,
	"body" text NOT NULL,
	"position" integer NOT NULL,
	"status" "words_response_status" DEFAULT 'pending_review' NOT NULL,
	"rejection_reason" text,
	"like_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_words_resp_user_pos" UNIQUE("user_id","position"),
	CONSTRAINT "words_resp_body_length" CHECK (length("words_responses"."body") BETWEEN 100 AND 280),
	CONSTRAINT "words_resp_position_range" CHECK ("words_responses"."position" BETWEEN 1 AND 15)
);
--> statement-breakpoint
ALTER TABLE "words_likes" ADD CONSTRAINT "words_likes_liker_id_users_id_fk" FOREIGN KEY ("liker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "words_likes" ADD CONSTRAINT "words_likes_liked_user_id_users_id_fk" FOREIGN KEY ("liked_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "words_likes" ADD CONSTRAINT "words_likes_response_id_words_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."words_responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "words_responses" ADD CONSTRAINT "words_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "words_responses" ADD CONSTRAINT "words_responses_prompt_id_words_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."words_prompts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_words_likes_received" ON "words_likes" USING btree ("liked_user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_words_prompts_active" ON "words_prompts" USING btree ("locale","active");--> statement-breakpoint
CREATE INDEX "idx_words_resp_active_user" ON "words_responses" USING btree ("user_id","status");