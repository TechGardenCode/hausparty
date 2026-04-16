CREATE TABLE "scraper_raw_payloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scraper_name" text NOT NULL,
	"entity_type" text NOT NULL,
	"external_id" text NOT NULL,
	"raw_json" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scraper_run_id" uuid
);
--> statement-breakpoint
ALTER TABLE "scraper_raw_payloads" ADD CONSTRAINT "scraper_raw_payloads_scraper_run_id_scraper_runs_id_fk" FOREIGN KEY ("scraper_run_id") REFERENCES "public"."scraper_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scraper_raw_payloads_unique" ON "scraper_raw_payloads" USING btree ("scraper_name","entity_type","external_id","fetched_at");--> statement-breakpoint
CREATE INDEX "scraper_raw_payloads_lookup_idx" ON "scraper_raw_payloads" USING btree ("scraper_name","entity_type","external_id","fetched_at");