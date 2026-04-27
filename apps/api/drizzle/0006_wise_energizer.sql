CREATE TYPE "public"."knot_channel" AS ENUM('confidant', 'match_onboarding', 'voice_helper', 'words_helper');--> statement-breakpoint
CREATE TYPE "public"."knot_message_role" AS ENUM('user', 'knot', 'system');--> statement-breakpoint
CREATE TABLE "knot_conversation_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "knot_message_role" NOT NULL,
	"content" text NOT NULL,
	"tokens_in" integer,
	"tokens_out" integer,
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knot_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" "knot_channel" NOT NULL,
	"day_index" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knot_conversation_messages" ADD CONSTRAINT "knot_conversation_messages_conversation_id_knot_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."knot_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knot_conversations" ADD CONSTRAINT "knot_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_knot_conv_msgs_conv" ON "knot_conversation_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_knot_conv_user_channel" ON "knot_conversations" USING btree ("user_id","channel");