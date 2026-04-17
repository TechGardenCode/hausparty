CREATE TYPE "public"."user_action" AS ENUM('view_set', 'play', 'save', 'report', 'submit');--> statement-breakpoint
CREATE TABLE "play_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"set_id" uuid NOT NULL,
	"source_id" uuid,
	"platform" "platform" NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"last_heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_position_seconds" integer DEFAULT 0 NOT NULL,
	"duration_listened_seconds" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" "user_action" NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "play_events" ADD CONSTRAINT "play_events_set_id_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_events" ADD CONSTRAINT "play_events_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "play_events_session_unique" ON "play_events" USING btree ("user_id","set_id","started_at");--> statement-breakpoint
CREATE INDEX "play_events_user_recent_idx" ON "play_events" USING btree ("user_id","last_heartbeat_at");--> statement-breakpoint
CREATE INDEX "play_events_set_idx" ON "play_events" USING btree ("set_id");--> statement-breakpoint
CREATE INDEX "user_activity_user_created_idx" ON "user_activity" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_activity_target_idx" ON "user_activity" USING btree ("target_type","target_id");