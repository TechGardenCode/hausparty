-- Prod-ready seed data: real 2025-2026 events to build off of.
-- Uses ON CONFLICT DO NOTHING so it's safe on dev (where 0001 seed already exists).

-- Additional genres (fill gaps in the electronic music taxonomy)
INSERT INTO genres (id, name, slug) VALUES
  ('a0000000-0000-0000-0000-000000000012', 'Progressive House', 'progressive-house'),
  ('a0000000-0000-0000-0000-000000000013', 'Melodic Techno', 'melodic-techno'),
  ('a0000000-0000-0000-0000-000000000014', 'Afro House', 'afro-house'),
  ('a0000000-0000-0000-0000-000000000015', 'Psytrance', 'psytrance')
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Additional artists for 2025-2026 lineups
INSERT INTO artists (id, name, slug, aliases, bio, socials) VALUES
  ('b0000000-0000-0000-0000-000000000016', 'Anyma', 'anyma', '{"Matteo Milleri"}', 'Italian DJ and producer, one half of Tale Of Us, known for immersive audiovisual techno experiences.', '{"instagram": "anyaboron", "soundcloud": "anyma-music"}'),
  ('b0000000-0000-0000-0000-000000000017', 'Boris Brejcha', 'boris-brejcha', '{}', 'German DJ and producer, pioneer of high-tech minimal with signature joker mask.', '{"instagram": "borisbrejcha", "soundcloud": "borisbrejcha"}'),
  ('b0000000-0000-0000-0000-000000000018', 'Vintage Culture', 'vintage-culture', '{"Lukas Ruiz"}', 'Brazilian DJ and producer, one of the biggest names in melodic house globally.', '{"instagram": "vintageculture", "soundcloud": "vintageculture"}'),
  ('b0000000-0000-0000-0000-000000000019', 'Indira Paganotto', 'indira-paganotto', '{}', 'Spanish techno DJ and producer known for dark, industrial sets.', '{"instagram": "indirapaganotto", "soundcloud": "indira-paganotto"}'),
  ('b0000000-0000-0000-0000-000000000020', 'John Summit', 'john-summit', '{"John Schuster"}', 'American DJ and producer leading the tech house movement.', '{"instagram": "johnsummit", "soundcloud": "johnsummit"}')
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Artist genre associations for new artists
INSERT INTO artist_genres (artist_id, genre_id) VALUES
  ('b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000013'),
  ('b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000006'),
  ('b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000002'),
  ('b0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000013'),
  ('b0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Additional festivals
INSERT INTO festivals (id, name, slug, description) VALUES
  ('c0000000-0000-0000-0000-000000000006', 'EDC Las Vegas', 'edc-las-vegas', 'Electric Daisy Carnival, the flagship Insomniac festival held annually at the Las Vegas Motor Speedway.'),
  ('c0000000-0000-0000-0000-000000000007', 'Sonar', 'sonar', 'Barcelona-based festival of advanced music and new media art, running since 1994.'),
  ('c0000000-0000-0000-0000-000000000008', 'Drumcode Festival', 'drumcode-festival', 'Adam Beyer''s annual techno showcase in Amsterdam, celebrating the Drumcode label sound.')
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Festival genre associations for new festivals
INSERT INTO festival_genres (festival_id, genre_id) VALUES
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000004'),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000005'),
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000007'),
  ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Real 2025-2026 events
INSERT INTO events (id, name, slug, festival_id, date_start, date_end, location, stages, venue) VALUES
  ('d0000000-0000-0000-0000-000000000010', 'Ultra Music Festival Miami 2026', 'ultra-miami-2026', 'c0000000-0000-0000-0000-000000000002', '2026-03-27', '2026-03-29', 'Bayfront Park, Miami, USA', '{"Mainstage", "RESISTANCE", "Worldwide", "Live"}', 'Bayfront Park'),
  ('d0000000-0000-0000-0000-000000000011', 'Tomorrowland Belgium 2025 Weekend 1', 'tomorrowland-belgium-2025-w1', 'c0000000-0000-0000-0000-000000000001', '2025-07-18', '2025-07-20', 'Boom, Belgium', '{"Mainstage", "Freedom", "Atmosphere", "Core", "KNTXT"}', 'De Schorre'),
  ('d0000000-0000-0000-0000-000000000012', 'Tomorrowland Belgium 2025 Weekend 2', 'tomorrowland-belgium-2025-w2', 'c0000000-0000-0000-0000-000000000001', '2025-07-25', '2025-07-27', 'Boom, Belgium', '{"Mainstage", "Freedom", "Atmosphere", "Core", "KNTXT"}', 'De Schorre'),
  ('d0000000-0000-0000-0000-000000000013', 'Awakenings ADE 2025', 'awakenings-ade-2025', 'c0000000-0000-0000-0000-000000000004', '2025-10-16', '2025-10-19', 'Amsterdam, Netherlands', '{"Gashouder", "Warehouse"}', 'Gashouder'),
  ('d0000000-0000-0000-0000-000000000014', 'EDC Las Vegas 2025', 'edc-las-vegas-2025', 'c0000000-0000-0000-0000-000000000006', '2025-05-16', '2025-05-18', 'Las Vegas, Nevada, USA', '{"kineticFIELD", "circuitGROUNDS", "cosmicMEADOW", "neonGARDEN", "bassPOD"}', 'Las Vegas Motor Speedway'),
  ('d0000000-0000-0000-0000-000000000015', 'Sonar Barcelona 2025', 'sonar-barcelona-2025', 'c0000000-0000-0000-0000-000000000007', '2025-06-19', '2025-06-21', 'Barcelona, Spain', '{"SonarHall", "SonarPub", "SonarVillage", "SonarCar"}', 'Fira Montjuic'),
  ('d0000000-0000-0000-0000-000000000016', 'Drumcode Festival 2025', 'drumcode-festival-2025', 'c0000000-0000-0000-0000-000000000008', '2025-10-18', '2025-10-18', 'Amsterdam, Netherlands', '{"Main", "Warehouse"}', 'NDSM Docklands'),
  ('d0000000-0000-0000-0000-000000000017', 'Qlimax 2025', 'qlimax-2025', 'c0000000-0000-0000-0000-000000000005', '2025-11-22', '2025-11-22', 'Arnhem, Netherlands', '{"Main"}', 'GelreDome'),
  ('d0000000-0000-0000-0000-000000000018', 'Boiler Room London 2025', 'boiler-room-london-2025', 'c0000000-0000-0000-0000-000000000003', '2025-09-20', '2025-09-20', 'London, UK', '{"Studio"}', NULL)
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Event-artist lineups for 2025-2026 events (curated from known/likely headliners)
INSERT INTO event_artists (event_id, artist_id, stage) VALUES
  -- Ultra Miami 2026
  ('d0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000005', 'Mainstage'),
  ('d0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000004', 'Mainstage'),
  ('d0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000007', 'Mainstage'),
  ('d0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000003', 'RESISTANCE'),
  ('d0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000016', 'RESISTANCE'),
  ('d0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000020', 'Worldwide'),
  -- Tomorrowland Belgium 2025 W1
  ('d0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000001', 'KNTXT'),
  ('d0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000003', 'KNTXT'),
  ('d0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000016', 'Mainstage'),
  ('d0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000010', 'Mainstage'),
  ('d0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000018', 'Freedom'),
  ('d0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000013', 'Atmosphere'),
  -- Awakenings ADE 2025
  ('d0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000001', 'Gashouder'),
  ('d0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000011', 'Gashouder'),
  ('d0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000019', 'Warehouse'),
  ('d0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000017', 'Gashouder'),
  -- Drumcode Festival 2025
  ('d0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000011', 'Main'),
  ('d0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000001', 'Main'),
  ('d0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000019', 'Warehouse'),
  -- Qlimax 2025
  ('d0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000014', 'Main'),
  ('d0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000015', 'Main')
ON CONFLICT DO NOTHING;
