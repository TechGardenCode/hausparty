CREATE TABLE "source_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"set_id" uuid NOT NULL,
	"url" text NOT NULL,
	"platform" "platform" NOT NULL,
	"source_type" "source_type" DEFAULT 'fan' NOT NULL,
	"media_type" "media_type" DEFAULT 'video' NOT NULL,
	"note" text,
	"status" "submission_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "source_suggestions" ADD CONSTRAINT "source_suggestions_set_id_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_source_suggestions_user" ON "source_suggestions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_source_suggestions_status" ON "source_suggestions" USING btree ("status");