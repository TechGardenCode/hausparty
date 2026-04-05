import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  date,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================
// ENUMS
// ============================================================

export const platformEnum = pgEnum("platform", ["youtube", "soundcloud"]);
export const sourceTypeEnum = pgEnum("source_type", ["official", "artist", "fan"]);
export const mediaTypeEnum = pgEnum("media_type", ["video", "audio"]);
export const followTargetEnum = pgEnum("follow_target", ["artist", "festival", "genre"]);
export const submissionStatusEnum = pgEnum("submission_status", ["pending", "approved", "rejected"]);
export const userRoleEnum = pgEnum("user_role", ["viewer", "artist", "festival_manager", "site_admin"]);
export const setStatusEnum = pgEnum("set_status", ["draft", "published"]);
export const scraperStatusEnum = pgEnum("scraper_status", ["running", "completed", "failed"]);

// ============================================================
// CONTENT TABLES
// ============================================================

export const genres = pgTable("genres", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const artists = pgTable("artists", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  aliases: text("aliases").array().default([]),
  imageUrl: text("image_url"),
  bio: text("bio"),
  socials: jsonb("socials").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const artistGenres = pgTable(
  "artist_genres",
  {
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genres.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.artistId, t.genreId] })]
);

export const festivals = pgTable("festivals", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const festivalGenres = pgTable(
  "festival_genres",
  {
    festivalId: uuid("festival_id")
      .notNull()
      .references(() => festivals.id, { onDelete: "cascade" }),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genres.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.festivalId, t.genreId] })]
);

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  festivalId: uuid("festival_id").references(() => festivals.id, { onDelete: "set null" }),
  dateStart: date("date_start"),
  dateEnd: date("date_end"),
  location: text("location"),
  venue: text("venue"),
  stages: text("stages").array().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const eventArtists = pgTable(
  "event_artists",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    stage: text("stage"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.artistId] })]
);

export const sets = pgTable(
  "sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    stage: text("stage"),
    performedAt: timestamp("performed_at"),
    durationSeconds: integer("duration_seconds"),
    status: setStatusEnum("status").notNull().default("published"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_sets_performed_at").on(t.performedAt)]
);

export const setArtists = pgTable(
  "set_artists",
  {
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.setId, t.artistId] })]
);

export const setGenres = pgTable(
  "set_genres",
  {
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id, { onDelete: "cascade" }),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genres.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.setId, t.genreId] })]
);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    url: text("url").notNull(),
    sourceType: sourceTypeEnum("source_type").notNull().default("fan"),
    mediaType: mediaTypeEnum("media_type").notNull().default("video"),
    quality: text("quality"),
    embedSupported: boolean("embed_supported").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_sources_set_id").on(t.setId)]
);

export const tracklistEntries = pgTable(
  "tracklist_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    timestampSeconds: integer("timestamp_seconds"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_tracklist_set_id").on(t.setId, t.position)]
);

// ============================================================
// USER-SCOPED TABLES (user_id = Keycloak subject UUID)
// ============================================================

export const savedSets = pgTable(
  "saved_sets",
  {
    userId: uuid("user_id").notNull(),
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.setId] }),
    index("idx_saved_sets_user").on(t.userId),
  ]
);

export const follows = pgTable(
  "follows",
  {
    userId: uuid("user_id").notNull(),
    targetType: followTargetEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.targetType, t.targetId] }),
    index("idx_follows_user").on(t.userId),
  ]
);

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_collections_user").on(t.userId)]
);

export const collectionSets = pgTable(
  "collection_sets",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.setId] })]
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    url: text("url").notNull(),
    artistName: text("artist_name"),
    title: text("title"),
    eventName: text("event_name"),
    genre: text("genre"),
    stage: text("stage"),
    performedDate: date("performed_date"),
    description: text("description"),
    status: submissionStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    processedAt: timestamp("processed_at"),
    matchedSetId: uuid("matched_set_id").references(() => sets.id),
    rejectionReason: text("rejection_reason"),
  },
  (t) => [index("idx_submissions_user").on(t.userId)]
);

export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    role: userRoleEnum("role").notNull().default("viewer"),
    grantedAt: timestamp("granted_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("user_roles_user_id_role_key").on(t.userId, t.role),
    index("idx_user_roles_user").on(t.userId),
  ]
);

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id").primaryKey(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  autoplay: boolean("autoplay").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================
// SCRAPER INFRASTRUCTURE
// ============================================================

export const scraperRuns = pgTable(
  "scraper_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scraperName: text("scraper_name").notNull(),
    status: scraperStatusEnum("status").notNull().default("running"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    params: jsonb("params").default({}),
    stats: jsonb("stats").default({}),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_scraper_runs_name_started").on(t.scraperName, t.startedAt)]
);

export const scraperEntityMap = pgTable(
  "scraper_entity_map",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scraperName: text("scraper_name").notNull(),
    externalId: text("external_id").notNull(),
    entityType: text("entity_type").notNull(),
    internalId: uuid("internal_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("scraper_entity_map_unique").on(t.scraperName, t.externalId, t.entityType),
  ]
);

// ============================================================
// RELATIONS
// ============================================================

export const genresRelations = relations(genres, ({ many }) => ({
  artistGenres: many(artistGenres),
  setGenres: many(setGenres),
  festivalGenres: many(festivalGenres),
}));

export const artistsRelations = relations(artists, ({ many }) => ({
  artistGenres: many(artistGenres),
  setArtists: many(setArtists),
  eventArtists: many(eventArtists),
}));

export const artistGenresRelations = relations(artistGenres, ({ one }) => ({
  artist: one(artists, { fields: [artistGenres.artistId], references: [artists.id] }),
  genre: one(genres, { fields: [artistGenres.genreId], references: [genres.id] }),
}));

export const festivalsRelations = relations(festivals, ({ many }) => ({
  events: many(events),
  festivalGenres: many(festivalGenres),
}));

export const festivalGenresRelations = relations(festivalGenres, ({ one }) => ({
  festival: one(festivals, { fields: [festivalGenres.festivalId], references: [festivals.id] }),
  genre: one(genres, { fields: [festivalGenres.genreId], references: [genres.id] }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  festival: one(festivals, { fields: [events.festivalId], references: [festivals.id] }),
  sets: many(sets),
  eventArtists: many(eventArtists),
}));

export const eventArtistsRelations = relations(eventArtists, ({ one }) => ({
  event: one(events, { fields: [eventArtists.eventId], references: [events.id] }),
  artist: one(artists, { fields: [eventArtists.artistId], references: [artists.id] }),
}));

export const setsRelations = relations(sets, ({ one, many }) => ({
  event: one(events, { fields: [sets.eventId], references: [events.id] }),
  setArtists: many(setArtists),
  setGenres: many(setGenres),
  sources: many(sources),
  tracklistEntries: many(tracklistEntries),
}));

export const setArtistsRelations = relations(setArtists, ({ one }) => ({
  set: one(sets, { fields: [setArtists.setId], references: [sets.id] }),
  artist: one(artists, { fields: [setArtists.artistId], references: [artists.id] }),
}));

export const setGenresRelations = relations(setGenres, ({ one }) => ({
  set: one(sets, { fields: [setGenres.setId], references: [sets.id] }),
  genre: one(genres, { fields: [setGenres.genreId], references: [genres.id] }),
}));

export const sourcesRelations = relations(sources, ({ one }) => ({
  set: one(sets, { fields: [sources.setId], references: [sets.id] }),
}));

export const tracklistEntriesRelations = relations(tracklistEntries, ({ one }) => ({
  set: one(sets, { fields: [tracklistEntries.setId], references: [sets.id] }),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  collectionSets: many(collectionSets),
}));

export const collectionSetsRelations = relations(collectionSets, ({ one }) => ({
  collection: one(collections, { fields: [collectionSets.collectionId], references: [collections.id] }),
  set: one(sets, { fields: [collectionSets.setId], references: [sets.id] }),
}));

export const savedSetsRelations = relations(savedSets, ({ one }) => ({
  set: one(sets, { fields: [savedSets.setId], references: [sets.id] }),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  matchedSet: one(sets, { fields: [submissions.matchedSetId], references: [sets.id] }),
}));
