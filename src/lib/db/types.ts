import type { InferSelectModel } from "drizzle-orm";
import type {
  genres,
  artists,
  festivals,
  events,
  sets,
  sources,
  tracklistEntries,
  savedSets,
  follows,
  collections,
  submissions,
  userRoles,
  scraperRuns,
  scraperEntityMap,
  userSettings,
} from "./schema";

// Row types inferred from Drizzle schema
export type Genre = InferSelectModel<typeof genres>;
export type Artist = InferSelectModel<typeof artists>;
export type Festival = InferSelectModel<typeof festivals>;
export type Event = InferSelectModel<typeof events>;
export type DjSet = InferSelectModel<typeof sets>;
export type Source = InferSelectModel<typeof sources>;
export type TracklistEntry = InferSelectModel<typeof tracklistEntries>;
export type SavedSet = InferSelectModel<typeof savedSets>;
export type Follow = InferSelectModel<typeof follows>;
export type Collection = InferSelectModel<typeof collections>;
export type Submission = InferSelectModel<typeof submissions>;
export type UserRoleRow = InferSelectModel<typeof userRoles>;
export type ScraperRun = InferSelectModel<typeof scraperRuns>;
export type ScraperEntityMap = InferSelectModel<typeof scraperEntityMap>;
export type UserSettings = InferSelectModel<typeof userSettings>;

// Enum types
export type Platform = "youtube" | "soundcloud";
export type SourceType = "official" | "artist" | "fan";
export type MediaType = "video" | "audio";
export type FollowTarget = "artist" | "festival" | "genre";
export type SubmissionStatus = "pending" | "approved" | "rejected";
export type UserRole = "viewer" | "artist" | "festival_manager" | "site_admin";
export type SetStatus = "draft" | "published";
export type ScraperStatus = "running" | "completed" | "failed";

// Joined query result shapes
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
