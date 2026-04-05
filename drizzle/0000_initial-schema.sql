CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
CREATE TABLE genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  aliases text[] DEFAULT '{}',
  image_url text,
  bio text,
  socials jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE artist_genres (
  artist_id uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  genre_id uuid NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (artist_id, genre_id)
);
--> statement-breakpoint
CREATE TABLE festivals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE festival_genres (
  festival_id uuid NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  genre_id uuid NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (festival_id, genre_id)
);
--> statement-breakpoint
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  festival_id uuid REFERENCES festivals(id) ON DELETE SET NULL,
  date_start date,
  date_end date,
  location text,
  stages text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  stage text,
  performed_at timestamptz,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE set_artists (
  set_id uuid NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (set_id, artist_id)
);
--> statement-breakpoint
CREATE TABLE set_genres (
  set_id uuid NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  genre_id uuid NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (set_id, genre_id)
);
--> statement-breakpoint
CREATE TYPE platform AS ENUM ('youtube', 'soundcloud');
--> statement-breakpoint
CREATE TYPE source_type AS ENUM ('official', 'artist', 'fan');
--> statement-breakpoint
CREATE TYPE media_type AS ENUM ('video', 'audio');
--> statement-breakpoint
CREATE TABLE sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  platform platform NOT NULL,
  url text NOT NULL,
  source_type source_type NOT NULL DEFAULT 'fan',
  media_type media_type NOT NULL DEFAULT 'video',
  quality text,
  embed_supported boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE tracklist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  position integer NOT NULL,
  title text NOT NULL,
  timestamp_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE saved_sets (
  user_id uuid NOT NULL,
  set_id uuid NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, set_id)
);
--> statement-breakpoint
CREATE TYPE follow_target AS ENUM ('artist', 'festival', 'genre');
--> statement-breakpoint
CREATE TABLE follows (
  user_id uuid NOT NULL,
  target_type follow_target NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);
--> statement-breakpoint
CREATE TABLE collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE collection_sets (
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  set_id uuid NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, set_id)
);
--> statement-breakpoint
CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected');
--> statement-breakpoint
CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  url text NOT NULL,
  artist_name text,
  title text,
  event_name text,
  genre text,
  stage text,
  performed_date date,
  description text,
  status submission_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  matched_set_id uuid REFERENCES sets(id),
  rejection_reason text
);
--> statement-breakpoint
CREATE TYPE user_role AS ENUM ('viewer', 'artist', 'festival_manager', 'site_admin');
--> statement-breakpoint
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);
--> statement-breakpoint
CREATE TYPE scraper_status AS ENUM ('running', 'completed', 'failed');
--> statement-breakpoint
CREATE TABLE scraper_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scraper_name text NOT NULL,
  status scraper_status NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  params jsonb DEFAULT '{}',
  stats jsonb DEFAULT '{}',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE scraper_entity_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scraper_name text NOT NULL,
  external_id text NOT NULL,
  entity_type text NOT NULL,
  internal_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scraper_name, external_id, entity_type)
);
--> statement-breakpoint
CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY,
  display_name text,
  avatar_url text,
  autoplay boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX idx_artists_name_trgm ON artists USING gin (name gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX idx_artists_aliases ON artists USING gin (aliases);
--> statement-breakpoint
CREATE INDEX idx_sets_title_trgm ON sets USING gin (title gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX idx_festivals_name_trgm ON festivals USING gin (name gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX idx_events_date ON events (date_start DESC);
--> statement-breakpoint
CREATE INDEX idx_sets_performed_at ON sets (performed_at DESC);
--> statement-breakpoint
CREATE INDEX idx_sources_set_id ON sources (set_id);
--> statement-breakpoint
CREATE INDEX idx_tracklist_set_id ON tracklist_entries (set_id, position);
--> statement-breakpoint
CREATE INDEX idx_saved_sets_user ON saved_sets (user_id);
--> statement-breakpoint
CREATE INDEX idx_follows_user ON follows (user_id);
--> statement-breakpoint
CREATE INDEX idx_collections_user ON collections (user_id);
--> statement-breakpoint
CREATE INDEX idx_submissions_user ON submissions (user_id);
--> statement-breakpoint
CREATE INDEX idx_user_roles_user ON user_roles (user_id);
--> statement-breakpoint
CREATE INDEX idx_scraper_runs_name_started ON scraper_runs (scraper_name, started_at DESC);
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
GROUP BY s.id, s.title, s.slug, s.performed_at, s.duration_seconds, e.name, e.slug, f.name, f.slug;
--> statement-breakpoint
CREATE INDEX idx_sets_search_vector ON sets_search USING gin (search_vector);
--> statement-breakpoint
CREATE INDEX idx_sets_search_trgm ON sets_search USING gin (search_text gin_trgm_ops);
--> statement-breakpoint
CREATE UNIQUE INDEX sets_search_set_id_idx ON sets_search (set_id);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION refresh_search_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY sets_search;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION search_sets(search_query text, result_limit int DEFAULT 20)
RETURNS TABLE(set_id uuid, rank real)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ss.set_id,
    (
      COALESCE(ts_rank(ss.search_vector, plainto_tsquery('english', search_query)), 0) +
      COALESCE(similarity(ss.search_text, search_query), 0)
    )::real AS rank
  FROM sets_search ss
  WHERE
    ss.search_vector @@ plainto_tsquery('english', search_query)
    OR similarity(ss.search_text, search_query) > 0.1
  ORDER BY rank DESC
  LIMIT result_limit;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION find_similar_artists_by_name(search_name text, similarity_threshold real DEFAULT 0.6)
RETURNS TABLE(artist_id uuid, artist_name text, sim real)
LANGUAGE sql
STABLE
AS $$
  SELECT
    a.id AS artist_id,
    a.name AS artist_name,
    similarity(a.name, search_name)::real AS sim
  FROM artists a
  WHERE similarity(a.name, search_name) > similarity_threshold
  ORDER BY sim DESC
  LIMIT 5;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION find_similar_artists(similarity_threshold real DEFAULT 0.7)
RETURNS TABLE(artist1_id uuid, artist1_name text, artist2_id uuid, artist2_name text, sim real)
LANGUAGE sql
STABLE
AS $$
  SELECT
    a1.id AS artist1_id,
    a1.name AS artist1_name,
    a2.id AS artist2_id,
    a2.name AS artist2_name,
    similarity(a1.name, a2.name)::real AS sim
  FROM artists a1
  CROSS JOIN artists a2
  WHERE a1.id < a2.id
    AND similarity(a1.name, a2.name) > similarity_threshold
  ORDER BY sim DESC
  LIMIT 100;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION merge_artists(canonical_id uuid, duplicate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dup_name text;
  dup_aliases text[];
  canonical_aliases text[];
BEGIN
  SELECT name, COALESCE(aliases, '{}')
  INTO dup_name, dup_aliases
  FROM artists
  WHERE id = duplicate_id;

  IF dup_name IS NULL THEN
    RAISE EXCEPTION 'Duplicate artist % not found', duplicate_id;
  END IF;

  SELECT COALESCE(aliases, '{}')
  INTO canonical_aliases
  FROM artists
  WHERE id = canonical_id;

  IF canonical_aliases IS NULL THEN
    RAISE EXCEPTION 'Canonical artist % not found', canonical_id;
  END IF;

  UPDATE artists
  SET aliases = (
    SELECT array_agg(DISTINCT val)
    FROM unnest(canonical_aliases || dup_aliases || ARRAY[dup_name]) AS val
    WHERE val IS NOT NULL
  )
  WHERE id = canonical_id;

  UPDATE set_artists
  SET artist_id = canonical_id
  WHERE artist_id = duplicate_id
    AND set_id NOT IN (
      SELECT set_id FROM set_artists WHERE artist_id = canonical_id
    );

  DELETE FROM set_artists WHERE artist_id = duplicate_id;

  INSERT INTO artist_genres (artist_id, genre_id)
  SELECT canonical_id, genre_id
  FROM artist_genres
  WHERE artist_id = duplicate_id
  ON CONFLICT DO NOTHING;

  DELETE FROM artist_genres WHERE artist_id = duplicate_id;

  UPDATE scraper_entity_map
  SET internal_id = canonical_id, updated_at = now()
  WHERE internal_id = duplicate_id AND entity_type = 'artist';

  DELETE FROM artists WHERE id = duplicate_id;
END;
$$;
