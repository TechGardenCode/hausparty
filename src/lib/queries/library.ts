import { db } from "@/lib/db";
import {
  savedSets,
  follows,
  collections,
  artists,
  festivals,
  genres,
  submissions,
} from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { normalizeSet } from "./sets";

export async function getSavedSets(userId: string) {
  const data = await db.query.savedSets.findMany({
    where: eq(savedSets.userId, userId),
    with: {
      set: {
        with: {
          setArtists: { with: { artist: true } },
          setGenres: { with: { genre: true } },
          event: { with: { festival: true } },
          sources: true,
        },
      },
    },
    orderBy: [desc(savedSets.createdAt)],
  });

  return data
    .filter((item) => item.set !== null)
    .map((item) => normalizeSet(item.set));
}

export async function getFollowedArtists(userId: string) {
  const data = await db
    .select({ targetId: follows.targetId })
    .from(follows)
    .where(and(eq(follows.userId, userId), eq(follows.targetType, "artist")))
    .orderBy(desc(follows.createdAt));

  if (data.length === 0) return [];

  const artistIds = data.map((f) => f.targetId);

  const artistData = await db.query.artists.findMany({
    where: inArray(artists.id, artistIds),
    with: {
      artistGenres: { with: { genre: true } },
    },
  });

  return artistData.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    image_url: a.imageUrl,
    genres: (a.artistGenres || [])
      .map((ag) => ag.genre)
      .filter((g): g is NonNullable<typeof g> => g !== null),
  }));
}

export async function getFollowedFestivals(userId: string) {
  const data = await db
    .select({ targetId: follows.targetId })
    .from(follows)
    .where(and(eq(follows.userId, userId), eq(follows.targetType, "festival")))
    .orderBy(desc(follows.createdAt));

  if (data.length === 0) return [];

  const festivalIds = data.map((f) => f.targetId);

  const festivalData = await db.query.festivals.findMany({
    where: inArray(festivals.id, festivalIds),
  });

  return festivalData.map((f) => ({
    id: f.id,
    name: f.name,
    slug: f.slug,
    image_url: f.imageUrl,
  }));
}

export async function getFollowedGenres(userId: string) {
  const data = await db
    .select({ targetId: follows.targetId })
    .from(follows)
    .where(and(eq(follows.userId, userId), eq(follows.targetType, "genre")))
    .orderBy(desc(follows.createdAt));

  if (data.length === 0) return [];

  const genreIds = data.map((f) => f.targetId);

  const genreData = await db.query.genres.findMany({
    where: inArray(genres.id, genreIds),
  });

  return genreData.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
  }));
}

export async function getCollections(userId: string) {
  const data = await db.query.collections.findMany({
    where: eq(collections.userId, userId),
    with: {
      collectionSets: true,
    },
    orderBy: [desc(collections.createdAt)],
  });

  return data.map((c) => ({
    id: c.id,
    name: c.name,
    created_at: c.createdAt,
    set_count: c.collectionSets?.length || 0,
  }));
}

export async function getCollectionById(collectionId: string, userId: string) {
  const data = await db.query.collections.findFirst({
    where: and(eq(collections.id, collectionId), eq(collections.userId, userId)),
    with: {
      collectionSets: {
        with: {
          set: {
            with: {
              setArtists: { with: { artist: true } },
              setGenres: { with: { genre: true } },
              event: { with: { festival: true } },
              sources: true,
            },
          },
        },
      },
    },
  });

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    created_at: data.createdAt,
    sets: (data.collectionSets || [])
      .filter((cs) => cs.set !== null)
      .map((cs) => normalizeSet(cs.set)),
  };
}

export async function getCollectionsWithSetStatus(userId: string, setId: string) {
  // Get all collections for the user
  const userCollections = await db.query.collections.findMany({
    where: eq(collections.userId, userId),
    with: {
      collectionSets: true,
    },
    orderBy: [collections.name],
  });

  return userCollections.map((c) => ({
    id: c.id,
    name: c.name,
    containsSet: (c.collectionSets || []).some((cs) => cs.setId === setId),
  }));
}

export async function isSetSaved(userId: string, setId: string) {
  const [row] = await db
    .select({ setId: savedSets.setId })
    .from(savedSets)
    .where(and(eq(savedSets.userId, userId), eq(savedSets.setId, setId)))
    .limit(1);

  return !!row;
}

export async function getUserSubmissions(userId: string) {
  const data = await db.query.submissions.findMany({
    where: eq(submissions.userId, userId),
    with: {
      matchedSet: true,
    },
    orderBy: [desc(submissions.createdAt)],
  });

  return data.map((s) => ({
    id: s.id,
    url: s.url,
    artist_name: s.artistName,
    title: s.title,
    status: s.status,
    rejection_reason: s.rejectionReason,
    matched_set_id: s.matchedSetId,
    created_at: s.createdAt,
    matchedSet: s.matchedSet
      ? { slug: s.matchedSet.slug, title: s.matchedSet.title }
      : null,
  }));
}

export async function isFollowing(
  userId: string,
  targetType: "artist" | "festival" | "genre",
  targetId: string
) {
  const [row] = await db
    .select({ targetId: follows.targetId })
    .from(follows)
    .where(
      and(
        eq(follows.userId, userId),
        eq(follows.targetType, targetType),
        eq(follows.targetId, targetId)
      )
    )
    .limit(1);

  return !!row;
}
