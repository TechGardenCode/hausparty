-- Prod-ready seed data: real 2025-2026 events to build off of.
-- Uses ON CONFLICT (slug) DO NOTHING for idempotency on dev (where some data may already exist).
-- Join tables use slug-based subqueries to avoid UUID mismatches.

-- Additional genres
INSERT INTO genres (id, name, slug) VALUES
  ('a0000000-0000-0000-0000-000000000012', 'Progressive House', 'progressive-house'),
  ('a0000000-0000-0000-0000-000000000013', 'Melodic Techno', 'melodic-techno'),
  ('a0000000-0000-0000-0000-000000000014', 'Afro House', 'afro-house'),
  ('a0000000-0000-0000-0000-000000000015', 'Psytrance', 'psytrance')
ON CONFLICT (slug) DO NOTHING;
--> statement-breakpoint

-- Additional artists for 2025-2026 lineups
INSERT INTO artists (id, name, slug, aliases, bio, socials) VALUES
  ('b0000000-0000-0000-0000-000000000016', 'Anyma', 'anyma', '{"Matteo Milleri"}', 'Italian DJ and producer, one half of Tale Of Us, known for immersive audiovisual techno experiences.', '{"instagram": "anyaboron", "soundcloud": "anyma-music"}'),
  ('b0000000-0000-0000-0000-000000000017', 'Boris Brejcha', 'boris-brejcha', '{}', 'German DJ and producer, pioneer of high-tech minimal with signature joker mask.', '{"instagram": "borisbrejcha", "soundcloud": "borisbrejcha"}'),
  ('b0000000-0000-0000-0000-000000000018', 'Vintage Culture', 'vintage-culture', '{"Lukas Ruiz"}', 'Brazilian DJ and producer, one of the biggest names in melodic house globally.', '{"instagram": "vintageculture", "soundcloud": "vintageculture"}'),
  ('b0000000-0000-0000-0000-000000000019', 'Indira Paganotto', 'indira-paganotto', '{}', 'Spanish techno DJ and producer known for dark, industrial sets.', '{"instagram": "indirapaganotto", "soundcloud": "indira-paganotto"}'),
  ('b0000000-0000-0000-0000-000000000020', 'John Summit', 'john-summit', '{"John Schuster"}', 'American DJ and producer leading the tech house movement.', '{"instagram": "johnsummit", "soundcloud": "johnsummit"}')
ON CONFLICT (slug) DO NOTHING;
--> statement-breakpoint

-- Artist genre associations (slug-based lookups for idempotency)
INSERT INTO artist_genres (artist_id, genre_id)
SELECT a.id, g.id FROM artists a, genres g WHERE a.slug = 'anyma' AND g.slug = 'melodic-techno'
ON CONFLICT DO NOTHING;
INSERT INTO artist_genres (artist_id, genre_id)
SELECT a.id, g.id FROM artists a, genres g WHERE a.slug = 'anyma' AND g.slug = 'techno'
ON CONFLICT DO NOTHING;
INSERT INTO artist_genres (artist_id, genre_id)
SELECT a.id, g.id FROM artists a, genres g WHERE a.slug = 'boris-brejcha' AND g.slug = 'minimal'
ON CONFLICT DO NOTHING;
INSERT INTO artist_genres (artist_id, genre_id)
SELECT a.id, g.id FROM artists a, genres g WHERE a.slug = 'boris-brejcha' AND g.slug = 'techno'
ON CONFLICT DO NOTHING;
INSERT INTO artist_genres (artist_id, genre_id)
SELECT a.id, g.id FROM artists a, genres g WHERE a.slug = 'vintage-culture' AND g.slug = 'house'
ON CONFLICT DO NOTHING;
INSERT INTO artist_genres (artist_id, genre_id)
SELECT a.id, g.id FROM artists a, genres g WHERE a.slug = 'vintage-culture' AND g.slug = 'melodic-techno'
ON CONFLICT DO NOTHING;
INSERT INTO artist_genres (artist_id, genre_id)
SELECT a.id, g.id FROM artists a, genres g WHERE a.slug = 'indira-paganotto' AND g.slug = 'techno'
ON CONFLICT DO NOTHING;
INSERT INTO artist_genres (artist_id, genre_id)
SELECT a.id, g.id FROM artists a, genres g WHERE a.slug = 'john-summit' AND g.slug = 'house'
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Additional festivals
INSERT INTO festivals (id, name, slug, description) VALUES
  ('c0000000-0000-0000-0000-000000000006', 'EDC Las Vegas', 'edc-las-vegas', 'Electric Daisy Carnival, the flagship Insomniac festival held annually at the Las Vegas Motor Speedway.'),
  ('c0000000-0000-0000-0000-000000000007', 'Sonar', 'sonar', 'Barcelona-based festival of advanced music and new media art, running since 1994.'),
  ('c0000000-0000-0000-0000-000000000008', 'Drumcode Festival', 'drumcode-festival', 'Adam Beyer''s annual techno showcase in Amsterdam, celebrating the Drumcode label sound.')
ON CONFLICT (slug) DO NOTHING;
--> statement-breakpoint

-- Festival genre associations (slug-based lookups)
INSERT INTO festival_genres (festival_id, genre_id)
SELECT f.id, g.id FROM festivals f, genres g WHERE f.slug = 'edc-las-vegas' AND g.slug = 'house'
ON CONFLICT DO NOTHING;
INSERT INTO festival_genres (festival_id, genre_id)
SELECT f.id, g.id FROM festivals f, genres g WHERE f.slug = 'edc-las-vegas' AND g.slug = 'trance'
ON CONFLICT DO NOTHING;
INSERT INTO festival_genres (festival_id, genre_id)
SELECT f.id, g.id FROM festivals f, genres g WHERE f.slug = 'edc-las-vegas' AND g.slug = 'dubstep'
ON CONFLICT DO NOTHING;
INSERT INTO festival_genres (festival_id, genre_id)
SELECT f.id, g.id FROM festivals f, genres g WHERE f.slug = 'sonar' AND g.slug = 'techno'
ON CONFLICT DO NOTHING;
INSERT INTO festival_genres (festival_id, genre_id)
SELECT f.id, g.id FROM festivals f, genres g WHERE f.slug = 'sonar' AND g.slug = 'house'
ON CONFLICT DO NOTHING;
INSERT INTO festival_genres (festival_id, genre_id)
SELECT f.id, g.id FROM festivals f, genres g WHERE f.slug = 'sonar' AND g.slug = 'ambient'
ON CONFLICT DO NOTHING;
INSERT INTO festival_genres (festival_id, genre_id)
SELECT f.id, g.id FROM festivals f, genres g WHERE f.slug = 'drumcode-festival' AND g.slug = 'techno'
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Real 2025-2026 events (slug-based festival lookups)
INSERT INTO events (id, name, slug, festival_id, date_start, date_end, location, stages, venue)
SELECT 'd0000000-0000-0000-0000-000000000010', 'Ultra Music Festival Miami 2026', 'ultra-miami-2026', f.id, '2026-03-27', '2026-03-29', 'Bayfront Park, Miami, USA', '{"Mainstage", "RESISTANCE", "Worldwide", "Live"}', 'Bayfront Park'
FROM festivals f WHERE f.slug = 'ultra-music-festival'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO events (id, name, slug, festival_id, date_start, date_end, location, stages, venue)
SELECT 'd0000000-0000-0000-0000-000000000011', 'Tomorrowland Belgium 2025 Weekend 1', 'tomorrowland-belgium-2025-w1', f.id, '2025-07-18', '2025-07-20', 'Boom, Belgium', '{"Mainstage", "Freedom", "Atmosphere", "Core", "KNTXT"}', 'De Schorre'
FROM festivals f WHERE f.slug = 'tomorrowland'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO events (id, name, slug, festival_id, date_start, date_end, location, stages, venue)
SELECT 'd0000000-0000-0000-0000-000000000012', 'Tomorrowland Belgium 2025 Weekend 2', 'tomorrowland-belgium-2025-w2', f.id, '2025-07-25', '2025-07-27', 'Boom, Belgium', '{"Mainstage", "Freedom", "Atmosphere", "Core", "KNTXT"}', 'De Schorre'
FROM festivals f WHERE f.slug = 'tomorrowland'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO events (id, name, slug, festival_id, date_start, date_end, location, stages, venue)
SELECT 'd0000000-0000-0000-0000-000000000013', 'Awakenings ADE 2025', 'awakenings-ade-2025', f.id, '2025-10-16', '2025-10-19', 'Amsterdam, Netherlands', '{"Gashouder", "Warehouse"}', 'Gashouder'
FROM festivals f WHERE f.slug = 'awakenings'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO events (id, name, slug, festival_id, date_start, date_end, location, stages, venue)
SELECT 'd0000000-0000-0000-0000-000000000014', 'EDC Las Vegas 2025', 'edc-las-vegas-2025', f.id, '2025-05-16', '2025-05-18', 'Las Vegas, Nevada, USA', '{"kineticFIELD", "circuitGROUNDS", "cosmicMEADOW", "neonGARDEN", "bassPOD"}', 'Las Vegas Motor Speedway'
FROM festivals f WHERE f.slug = 'edc-las-vegas'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO events (id, name, slug, festival_id, date_start, date_end, location, stages, venue)
SELECT 'd0000000-0000-0000-0000-000000000015', 'Sonar Barcelona 2025', 'sonar-barcelona-2025', f.id, '2025-06-19', '2025-06-21', 'Barcelona, Spain', '{"SonarHall", "SonarPub", "SonarVillage", "SonarCar"}', 'Fira Montjuic'
FROM festivals f WHERE f.slug = 'sonar'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO events (id, name, slug, festival_id, date_start, date_end, location, stages, venue)
SELECT 'd0000000-0000-0000-0000-000000000016', 'Drumcode Festival 2025', 'drumcode-festival-2025', f.id, '2025-10-18', '2025-10-18', 'Amsterdam, Netherlands', '{"Main", "Warehouse"}', 'NDSM Docklands'
FROM festivals f WHERE f.slug = 'drumcode-festival'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO events (id, name, slug, festival_id, date_start, date_end, location, stages, venue)
SELECT 'd0000000-0000-0000-0000-000000000017', 'Qlimax 2025', 'qlimax-2025', f.id, '2025-11-22', '2025-11-22', 'Arnhem, Netherlands', '{"Main"}', 'GelreDome'
FROM festivals f WHERE f.slug = 'qlimax'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO events (id, name, slug, festival_id, date_start, date_end, location, stages, venue)
SELECT 'd0000000-0000-0000-0000-000000000018', 'Boiler Room London 2025', 'boiler-room-london-2025', f.id, '2025-09-20', '2025-09-20', 'London, UK', '{"Studio"}', NULL
FROM festivals f WHERE f.slug = 'boiler-room'
ON CONFLICT (slug) DO NOTHING;
--> statement-breakpoint

-- Event-artist lineups (slug-based lookups)
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('Mainstage')) AS s(stage)
WHERE e.slug = 'ultra-miami-2026' AND a.slug = 'martin-garrix'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('Mainstage')) AS s(stage)
WHERE e.slug = 'ultra-miami-2026' AND a.slug = 'hardwell'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('Mainstage')) AS s(stage)
WHERE e.slug = 'ultra-miami-2026' AND a.slug = 'armin-van-buuren'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('RESISTANCE')) AS s(stage)
WHERE e.slug = 'ultra-miami-2026' AND a.slug = 'charlotte-de-witte'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('RESISTANCE')) AS s(stage)
WHERE e.slug = 'ultra-miami-2026' AND a.slug = 'anyma'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('Worldwide')) AS s(stage)
WHERE e.slug = 'ultra-miami-2026' AND a.slug = 'john-summit'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('KNTXT')) AS s(stage)
WHERE e.slug = 'tomorrowland-belgium-2025-w1' AND a.slug = 'amelie-lens'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('KNTXT')) AS s(stage)
WHERE e.slug = 'tomorrowland-belgium-2025-w1' AND a.slug = 'charlotte-de-witte'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('Mainstage')) AS s(stage)
WHERE e.slug = 'tomorrowland-belgium-2025-w1' AND a.slug = 'anyma'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('Mainstage')) AS s(stage)
WHERE e.slug = 'tomorrowland-belgium-2025-w1' AND a.slug = 'david-guetta'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('Freedom')) AS s(stage)
WHERE e.slug = 'tomorrowland-belgium-2025-w1' AND a.slug = 'vintage-culture'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('Atmosphere')) AS s(stage)
WHERE e.slug = 'tomorrowland-belgium-2025-w1' AND a.slug = 'fred-again'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('Gashouder')) AS s(stage)
WHERE e.slug = 'awakenings-ade-2025' AND a.slug = 'amelie-lens'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('Gashouder')) AS s(stage)
WHERE e.slug = 'awakenings-ade-2025' AND a.slug = 'adam-beyer'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('Warehouse')) AS s(stage)
WHERE e.slug = 'awakenings-ade-2025' AND a.slug = 'indira-paganotto'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('Gashouder')) AS s(stage)
WHERE e.slug = 'awakenings-ade-2025' AND a.slug = 'boris-brejcha'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('Main')) AS s(stage)
WHERE e.slug = 'drumcode-festival-2025' AND a.slug = 'adam-beyer'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('Main')) AS s(stage)
WHERE e.slug = 'drumcode-festival-2025' AND a.slug = 'amelie-lens'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('Warehouse')) AS s(stage)
WHERE e.slug = 'drumcode-festival-2025' AND a.slug = 'indira-paganotto'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('Main')) AS s(stage)
WHERE e.slug = 'qlimax-2025' AND a.slug = 'headhunterz'
ON CONFLICT DO NOTHING;
INSERT INTO event_artists (event_id, artist_id, stage)
SELECT e.id, a.id, s.stage FROM events e, artists a, (VALUES ('Main')) AS s(stage)
WHERE e.slug = 'qlimax-2025' AND a.slug = 'brennan-heart'
ON CONFLICT DO NOTHING;
