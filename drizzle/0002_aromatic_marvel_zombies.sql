-- Add set_status enum and status column to sets
CREATE TYPE "public"."set_status" AS ENUM('draft', 'published');
--> statement-breakpoint
ALTER TABLE "sets" ADD COLUMN "status" "set_status" DEFAULT 'published' NOT NULL;
--> statement-breakpoint
CREATE INDEX "idx_sets_status" ON "sets" USING btree ("status");
--> statement-breakpoint

-- Update materialized view to only index published sets
DROP MATERIALIZED VIEW IF EXISTS sets_search;
--> statement-breakpoint
CREATE MATERIALIZED VIEW sets_search AS
SELECT
  s.id AS set_id,
  s.title,
  s.slug,
  s.performed_at,
  s.duration_seconds,
  e.name AS event_name,
  e.slug AS event_slug,
  f.name AS festival_name,
  f.slug AS festival_slug,
  array_agg(DISTINCT a.name) FILTER (WHERE a.name IS NOT NULL) AS artist_names,
  array_agg(DISTINCT a.slug) FILTER (WHERE a.slug IS NOT NULL) AS artist_slugs,
  array_agg(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL) AS genre_names,
  coalesce(s.title, '') || ' ' || coalesce(string_agg(DISTINCT a.name, ' '), '') || ' ' || coalesce(e.name, '') || ' ' || coalesce(f.name, '')
  AS search_text,
  setweight(to_tsvector('english', coalesce(s.title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(string_agg(DISTINCT a.name, ' '), '')), 'A') ||
  setweight(to_tsvector('english', coalesce(e.name, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(f.name, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(string_agg(DISTINCT g.name, ' '), '')), 'C')
  AS search_vector
FROM sets s
LEFT JOIN events e ON s.event_id = e.id
LEFT JOIN festivals f ON e.festival_id = f.id
LEFT JOIN set_artists sa ON sa.set_id = s.id
LEFT JOIN artists a ON sa.artist_id = a.id
LEFT JOIN set_genres sg ON sg.set_id = s.id
LEFT JOIN genres g ON sg.genre_id = g.id
WHERE s.status = 'published'
GROUP BY s.id, s.title, s.slug, s.performed_at, s.duration_seconds, e.name, e.slug, f.name, f.slug;
--> statement-breakpoint
CREATE INDEX idx_sets_search_vector ON sets_search USING gin (search_vector);
--> statement-breakpoint
CREATE INDEX idx_sets_search_trgm ON sets_search USING gin (search_text gin_trgm_ops);
--> statement-breakpoint
CREATE UNIQUE INDEX sets_search_set_id_idx ON sets_search (set_id);
--> statement-breakpoint
SELECT refresh_search_view();
