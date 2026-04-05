CREATE TABLE "event_artists" (
	"event_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"stage" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_artists_event_id_artist_id_pk" PRIMARY KEY("event_id","artist_id")
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "venue" text;--> statement-breakpoint
ALTER TABLE "event_artists" ADD CONSTRAINT "event_artists_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_artists" ADD CONSTRAINT "event_artists_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;