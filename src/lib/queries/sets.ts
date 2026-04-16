import { db } from "@/lib/db";
import { sets, setArtists, setGenres, setSlugRedirects } from "@/lib/db/schema";
import { eq, desc, asc, inArray, and } from "drizzle-orm";
import { getYouTubeThumbnail } from "@/lib/utils";

const MAX_REDIRECT_HOPS = 5;

/**
 * Resolve an incoming slug through set_slug_redirects + the merged_into_set_id
 * chain. Returns the canonical slug if the input was redirected, null if the
 * slug has no redirect (caller falls through to normal lookup).
 */
export async function resolveSlugRedirect(slug: string): Promise<string | null> {
  const [redirect] = await db
    .select({ newSetId: setSlugRedirects.newSetId })
    .from(setSlugRedirects)
    .where(eq(setSlugRedirects.oldSlug, slug))
    .limit(1);
  if (!redirect) return null;

  let currentId: string | null = redirect.newSetId;
  for (let hop = 0; hop < MAX_REDIRECT_HOPS && currentId; hop++) {
    const [row]: { slug: string; mergedIntoSetId: string | null }[] = await db
      .select({
        slug: sets.slug,
        mergedIntoSetId: sets.mergedIntoSetId,
      })
      .from(sets)
      .where(eq(sets.id, currentId))
      .limit(1);
    if (!row) return null;
    if (!row.mergedIntoSetId) return row.slug;
    currentId = row.mergedIntoSetId;
  }
  return null;
}

const setWithRelations = {
  setArtists: { with: { artist: true } },
  setGenres: { with: { genre: true } },
  event: { with: { festival: true } },
  sources: true,
} as const;

const setWithRelationsDetailed = {
  ...setWithRelations,
  tracklistEntries: true,
} as const;

export async function getTrendingSets(limit = 10) {
  const data = await db.query.sets.findMany({
    where: eq(sets.status, "published"),
    with: setWithRelations,
    orderBy: [desc(sets.performedAt)],
    limit,
  });

  return data.map(normalizeSet);
}

export async function getNewSets(limit = 10) {
  const data = await db.query.sets.findMany({
    where: eq(sets.status, "published"),
    with: setWithRelations,
    orderBy: [desc(sets.createdAt)],
    limit,
  });

  return data.map(normalizeSet);
}

export async function getSetBySlug(slug: string) {
  const data = await db.query.sets.findFirst({
    where: eq(sets.slug, slug),
    with: setWithRelationsDetailed,
  });

  if (!data) return null;
  return normalizeSet(data);
}

export async function getSetsByArtist(artistId: string) {
  // Find set IDs for this artist, then fetch full sets
  const artistSets = await db
    .select({ setId: setArtists.setId })
    .from(setArtists)
    .where(eq(setArtists.artistId, artistId));

  if (artistSets.length === 0) return [];

  const setIds = artistSets.map((s) => s.setId);

  const data = await db.query.sets.findMany({
    where: and(inArray(sets.id, setIds), eq(sets.status, "published")),
    with: setWithRelations,
    orderBy: [desc(sets.performedAt)],
  });

  return data.map(normalizeSet);
}

export async function getSetsByEvent(eventId: string) {
  const data = await db.query.sets.findMany({
    where: and(eq(sets.eventId, eventId), eq(sets.status, "published")),
    with: setWithRelations,
    orderBy: [asc(sets.performedAt)],
  });

  return data.map(normalizeSet);
}

export async function getSetsByGenre(genreId: string, page = 1, perPage = 20) {
  const offset = (page - 1) * perPage;

  // Find set IDs for this genre
  const genreSets = await db
    .select({ setId: setGenres.setId })
    .from(setGenres)
    .where(eq(setGenres.genreId, genreId));

  const totalCount = genreSets.length;

  if (totalCount === 0) {
    return { sets: [], total: 0, page, perPage };
  }

  const setIds = genreSets.map((s) => s.setId);

  const data = await db.query.sets.findMany({
    where: and(inArray(sets.id, setIds), eq(sets.status, "published")),
    with: setWithRelations,
    orderBy: [desc(sets.performedAt)],
    limit: perPage,
    offset,
  });

  return {
    sets: data.map(normalizeSet),
    total: totalCount,
    page,
    perPage,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeSet(row: any) {
  const artists = (row.setArtists || [])
    .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
    .map((sa: { artist: unknown }) => sa.artist)
    .filter((a: unknown): a is NonNullable<typeof a> => a !== null);

  const genres = (row.setGenres || [])
    .map((sg: { genre: unknown }) => sg.genre)
    .filter((g: unknown): g is NonNullable<typeof g> => g !== null);

  const sources = row.sources || [];
  const youtubeSource = sources.find(
    (s: { platform: string; url?: string }) => s.platform === "youtube" && s.url
  );
  const thumbnailUrl = getYouTubeThumbnail(youtubeSource?.url ?? null);

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status ?? "published",
    performed_at: row.performedAt,
    duration_seconds: row.durationSeconds,
    stage: row.stage,
    artists,
    genres,
    event: row.event
      ? {
          id: row.event.id,
          name: row.event.name,
          slug: row.event.slug,
          festivals: row.event.festival || null,
          date_start: row.event.dateStart ?? undefined,
          location: row.event.location ?? undefined,
          stages: row.event.stages ?? undefined,
        }
      : null,
    festival: row.event?.festival || null,
    sources: sources.map((s: Record<string, unknown>) => ({
      id: s.id,
      platform: s.platform,
      url: s.url,
      setId: s.setId,
      sourceType: s.sourceType,
      mediaType: s.mediaType,
      quality: s.quality,
      embedSupported: s.embedSupported,
      isActive: s.isActive,
      createdAt: s.createdAt,
    })),
    thumbnailUrl,
    tracklist: row.tracklistEntries
      ? [...row.tracklistEntries]
          .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
          .map((t: { id: string; position: number; title: string; timestampSeconds: number | null }) => ({
            id: t.id,
            position: t.position,
            title: t.title,
            timestamp_seconds: t.timestampSeconds,
          }))
      : undefined,
  };
}
