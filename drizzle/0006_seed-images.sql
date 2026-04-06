-- Populate image_url for seeded artists and festivals.
-- Only includes URLs verified via SoundCloud oEmbed API.
-- Artists without verified images (Bicep, Anyma, Boris Brejcha, Vintage Culture)
-- will use the app's initials fallback until manually added via admin.

-- Verified artist images (SoundCloud oEmbed thumbnails, 500x500)
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-ybJWq1tO2CnkJsOm-1uYUkg-t500x500.jpg' WHERE slug = 'amelie-lens';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-000014893963-91gp52-t500x500.jpg' WHERE slug = 'four-tet';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-2RSYTGzHUfSwpwzq-dx0aZQ-t500x500.jpg' WHERE slug = 'charlotte-de-witte';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-ShFfJLVklUyfJFzy-JpbkGA-t500x500.jpg' WHERE slug = 'hardwell';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-vWkUx8fham8DN8ZA-yZQRWA-t500x500.jpg' WHERE slug = 'martin-garrix';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-c5gNRWyjOLe5tMTi-c58yJg-t500x500.jpg' WHERE slug = 'peggy-gou';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-GQWo5l14olfcPHUG-0gzE7g-t500x500.jpg' WHERE slug = 'armin-van-buuren';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-wsitbXvcPabnaN0W-lKyqrg-t500x500.jpg' WHERE slug = 'tiesto';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-FlzeFA6Xeu13tiVv-IoDCsQ-t500x500.jpg' WHERE slug = 'david-guetta';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-cPuYKwqzbYYckQe7-59dayA-t500x500.jpg' WHERE slug = 'adam-beyer';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-XwtFLWgwPiGapw3s-HahzoA-t500x500.jpg' WHERE slug = 'calvin-harris';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-5pG8azq2hevJL4rQ-5Dc8SQ-t500x500.jpg' WHERE slug = 'fred-again';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-000723242863-spngia-t500x500.jpg' WHERE slug = 'headhunterz';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-UxvDzVwkoH0KsbuS-pe2y3w-t500x500.jpg' WHERE slug = 'brennan-heart';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-KccsQM7eWzKzcV6k-76viMw-t500x500.jpg' WHERE slug = 'indira-paganotto';
--> statement-breakpoint
UPDATE artists SET image_url = 'https://i1.sndcdn.com/avatars-A6uzrSnj0L1yhIzR-Y5rzEQ-t500x500.jpg' WHERE slug = 'john-summit';
--> statement-breakpoint

-- Festival images (Unsplash — generic festival/concert imagery)
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
UPDATE festivals SET image_url = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=400&fit=crop' WHERE slug = 'edc-las-vegas';
--> statement-breakpoint
UPDATE festivals SET image_url = 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&h=400&fit=crop' WHERE slug = 'sonar';
--> statement-breakpoint
UPDATE festivals SET image_url = 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=800&h=400&fit=crop' WHERE slug = 'drumcode-festival';
