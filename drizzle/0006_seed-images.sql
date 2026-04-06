-- Populate image_url for all seeded artists and festivals.
-- Uses UPDATE to work on both dev (where seed 0001 already ran) and prod (fresh DB).
-- Image URLs use high-quality official/press photos where available.

-- Artist images (from seed 0001)
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-IbMSiEP1DpDpEXMd-fYKKjw-t500x500.jpg' WHERE slug = 'amelie-lens';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-000451920803-1qw6ba-t500x500.jpg' WHERE slug = 'four-tet';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-Tyk5qVDjcWnV55Pk-kBh17A-t500x500.jpg' WHERE slug = 'charlotte-de-witte';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-000321562792-nja8fk-t500x500.jpg' WHERE slug = 'hardwell';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-000132610572-a2vmvq-t500x500.jpg' WHERE slug = 'martin-garrix';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-000297424020-x13ane-t500x500.jpg' WHERE slug = 'peggy-gou';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-000004770498-fzm16w-t500x500.jpg' WHERE slug = 'armin-van-buuren';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-000001040023-7eyqzn-t500x500.jpg' WHERE slug = 'tiesto';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-000117592498-bk8w4w-t500x500.jpg' WHERE slug = 'bicep';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-000001177498-jcf0hx-t500x500.jpg' WHERE slug = 'david-guetta';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-000003760023-1hfcvo-t500x500.jpg' WHERE slug = 'adam-beyer';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-000002428513-g10kkq-t500x500.jpg' WHERE slug = 'calvin-harris';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-SYxfLIp1dYTkfHHl-DW3QCw-t500x500.jpg' WHERE slug = 'fred-again';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-000017779293-fjmnql-t500x500.jpg' WHERE slug = 'headhunterz';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-000009419762-d5g0u7-t500x500.jpg' WHERE slug = 'brennan-heart';
--> statement-breakpoint

-- Artist images (from seed 0005)
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-N5a5B9iUMNDQPQsv-F4zcQQ-t500x500.jpg' WHERE slug = 'anyma';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-000199882804-r8z4y7-t500x500.jpg' WHERE slug = 'boris-brejcha';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-vFCzqLWxBQ7bK7LO-3hTRJQ-t500x500.jpg' WHERE slug = 'vintage-culture';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-000643127929-axzqxn-t500x500.jpg' WHERE slug = 'indira-paganotto';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-rATjfDj3u0EJcFNI-s7zN5Q-t500x500.jpg' WHERE slug = 'john-summit';
--> statement-breakpoint

-- Festival images (from seed 0001)
UPDATE festivals SET image_url = 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=400&fit=crop' WHERE slug = 'tomorrowland';
--> statement-breakpoint
UPDATE festivals SET image_url = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=400&fit=crop' WHERE slug = 'ultra-music-festival';
--> statement-breakpoint
UPDATE festivals SET image_url = 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=400&fit=crop' WHERE slug = 'boiler-room';
--> statement-breakpoint
UPDATE festivals SET image_url = 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&h=400&fit=crop' WHERE slug = 'awakenings';
--> statement-breakpoint
UPDATE festivals SET image_url = 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&h=400&fit=crop' WHERE slug = 'qlimax';
--> statement-breakpoint

-- Festival images (from seed 0005)
UPDATE festivals SET image_url = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=400&fit=crop' WHERE slug = 'edc-las-vegas';
--> statement-breakpoint
UPDATE festivals SET image_url = 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&h=400&fit=crop' WHERE slug = 'sonar';
--> statement-breakpoint
UPDATE festivals SET image_url = 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=800&h=400&fit=crop' WHERE slug = 'drumcode-festival';
