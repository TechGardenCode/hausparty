ALTER TYPE "public"."set_status" ADD VALUE 'merged';--> statement-breakpoint
CREATE TABLE "set_slug_redirects" (
	"old_slug" text PRIMARY KEY NOT NULL,
	"new_set_id" uuid NOT NULL,
	"merged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sets" ADD COLUMN "merged_into_set_id" uuid;--> statement-breakpoint
ALTER TABLE "set_slug_redirects" ADD CONSTRAINT "set_slug_redirects_new_set_id_sets_id_fk" FOREIGN KEY ("new_set_id") REFERENCES "public"."sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sets" ADD CONSTRAINT "sets_merged_into_set_id_sets_id_fk" FOREIGN KEY ("merged_into_set_id") REFERENCES "public"."sets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sets_merged_into_idx" ON "sets" USING btree ("merged_into_set_id") WHERE "merged_into_set_id" IS NOT NULL;