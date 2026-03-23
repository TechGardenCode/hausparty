import type { Database, Tables, Enums } from "./supabase";

// Re-export generated helpers
export type { Database, Tables, Enums };

// Enum types derived from DB
export type Platform = Enums<"platform">;
export type SourceType = Enums<"source_type">;
export type MediaType = Enums<"media_type">;
export type FollowTarget = Enums<"follow_target">;
export type SubmissionStatus = Enums<"submission_status">;
export type UserRole = Enums<"user_role">;
export type ScraperStatus = Enums<"scraper_status">;

// Row types derived from DB
export type Genre = Tables<"genres">;
export type Artist = Tables<"artists">;
export type Festival = Tables<"festivals">;
export type Event = Tables<"events">;
export type DjSet = Tables<"sets">;
export type Source = Tables<"sources">;
export type TracklistEntry = Tables<"tracklist_entries">;
export type SavedSet = Tables<"saved_sets">;
export type Follow = Tables<"follows">;
export type Collection = Tables<"collections">;
export type Submission = Tables<"submissions">;
export type UserRoleRow = Tables<"user_roles">;
export type ScraperRun = Tables<"scraper_runs">;
export type ScraperEntityMap = Tables<"scraper_entity_map">;
export type UserSettings = Tables<"user_settings">;

// Joined query result shapes (not raw DB rows)
export interface SetWithDetails extends DjSet {
  artists: Pick<Artist, "id" | "name" | "slug">[];
  genres: Pick<Genre, "id" | "name" | "slug">[];
  event: Pick<Event, "id" | "name" | "slug"> | null;
  festival: Pick<Festival, "id" | "name" | "slug"> | null;
  sources: Source[];
}

export interface ArtistWithGenres extends Artist {
  genres: Pick<Genre, "id" | "name" | "slug">[];
  set_count: number;
}

export interface FestivalWithGenres extends Festival {
  genres: Pick<Genre, "id" | "name" | "slug">[];
  set_count: number;
}
