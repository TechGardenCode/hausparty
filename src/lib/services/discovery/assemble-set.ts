import { db } from "@/lib/db";
import { sets, setArtists, sources, events } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { slugify } from "@/lib/utils";
import { detectPlatform } from "@/lib/services/submission-processor";
import { normalizeSourceUrl } from "@/lib/services/url-normalization";
import { fetchYouTubeMetadata } from "@/lib/services/youtube";
import { fetchSoundCloudMetadata } from "@/lib/services/soundcloud";
import { parseYouTubeTitle } from "@/lib/services/normalization/title-parser";
import { classifySource } from "@/lib/services/normalization/source-classifier";
import { inferGenresForSet } from "@/lib/services/normalization/genre-inference";
import { evaluateAndRefreshIfPublished } from "@/lib/services/sets/completeness";
import type { Platform, MediaType } from "@/lib/db/types";

export interface AssembleOptions {
  url: string;
  artistId: string;
  artistName: string;
  eventId?: string;
  performedAt?: Date;
  /** Additional artist IDs for B2B sets. */
  b2bArtistIds?: string[];
}

export interface AssembleResult {
  setId: string;
  action: "created" | "duplicate" | "added_source";
  status: "draft" | "published";
}

/**
 * Assemble a draft set from a URL with pre-resolved metadata.
 *
 * Pipeline:
 * 1. Platform detect + URL normalize
 * 2. URL dedup check against sources table
 * 3. Fetch OEmbed metadata
 * 4. Parse title for additional metadata
 * 5. Classify source type (official/artist/fan)
 * 6. Check for existing set with same (artist, event)
 * 7. Create or augment set
 * 8. Infer genres from artist
 * 9. Run completeness scoring
 */
export async function assembleSetFromUrl(
  opts: AssembleOptions
): Promise<AssembleResult> {
  const { url, artistId, artistName, eventId, performedAt } = opts;

  // 1. Platform detect
  const platform = detectPlatform(url);
  if (!platform) {
    throw new Error(`Unsupported platform for URL: ${url}`);
  }

  // 2. URL dedup
  const normalizedUrl = normalizeSourceUrl(url);
  const [existingSource] = await db
    .select({ id: sources.id, setId: sources.setId })
    .from(sources)
    .where(eq(sources.url, normalizedUrl))
    .limit(1);

  if (existingSource) {
    return { setId: existingSource.setId, action: "duplicate", status: "draft" };
  }

  // 3. Fetch OEmbed metadata
  const metadata = await fetchMetadata(normalizedUrl, platform);

  // 4. Parse title for additional context
  const parsed = metadata ? parseYouTubeTitle(metadata.title) : null;

  // 5. Classify source type
  const sourceType = metadata
    ? classifySource({
        channelName: metadata.author,
        artistName,
        eventName: parsed?.eventOrVenue,
      })
    : "fan";

  // 6. Check for existing set with same artist + event
  if (eventId) {
    const existingSet = await findExistingSet(artistId, eventId);
    if (existingSet) {
      // Add source to existing set
      await createSource(existingSet, platform, normalizedUrl, sourceType);
      const status = await evaluateAndRefreshIfPublished(existingSet);
      return { setId: existingSet, action: "added_source", status };
    }
  }

  // 7. Create new draft set
  const title = parsed?.cleanTitle ?? metadata?.title ?? "Untitled Set";
  const setId = await createSet({
    title,
    artistName,
    eventId,
    performedAt,
  });

  // Link primary artist
  await db
    .insert(setArtists)
    .values({ setId, artistId, position: 0 })
    .onConflictDoNothing();

  // Link B2B artists
  const allArtistIds = [artistId];
  if (opts.b2bArtistIds) {
    for (let i = 0; i < opts.b2bArtistIds.length; i++) {
      await db
        .insert(setArtists)
        .values({ setId, artistId: opts.b2bArtistIds[i], position: i + 1 })
        .onConflictDoNothing();
      allArtistIds.push(opts.b2bArtistIds[i]);
    }
  }

  // Create source
  await createSource(setId, platform, normalizedUrl, sourceType);

  // 8. Infer genres from all artists
  await inferGenresForSet(setId, allArtistIds);

  // 9. Completeness scoring (may auto-publish)
  const finalStatus = await evaluateAndRefreshIfPublished(setId);

  return { setId, action: "created", status: finalStatus };
}

async function fetchMetadata(url: string, platform: Platform) {
  try {
    if (platform === "youtube") return await fetchYouTubeMetadata(url);
    if (platform === "soundcloud") return await fetchSoundCloudMetadata(url);
  } catch {
    // Non-fatal — we can create a set without metadata
  }
  return null;
}

async function findExistingSet(
  artistId: string,
  eventId: string
): Promise<string | null> {
  const [row] = await db
    .select({ setId: setArtists.setId })
    .from(setArtists)
    .innerJoin(sets, eq(sets.id, setArtists.setId))
    .where(and(eq(setArtists.artistId, artistId), eq(sets.eventId, eventId)))
    .limit(1);

  return row?.setId ?? null;
}

async function createSet(opts: {
  title: string;
  artistName: string;
  eventId?: string;
  performedAt?: Date;
}): Promise<string> {
  const slug = slugify(`${opts.artistName}-${opts.title}`);

  // Get performedAt from event if not provided
  let performedAt = opts.performedAt;
  if (!performedAt && opts.eventId) {
    const [event] = await db
      .select({ dateStart: events.dateStart })
      .from(events)
      .where(eq(events.id, opts.eventId))
      .limit(1);
    if (event?.dateStart) {
      performedAt = new Date(event.dateStart);
    }
  }

  try {
    const [newSet] = await db
      .insert(sets)
      .values({
        title: opts.title,
        slug,
        eventId: opts.eventId ?? null,
        performedAt: performedAt ?? null,
        status: "draft",
      })
      .returning({ id: sets.id });
    return newSet.id;
  } catch {
    // Slug collision — append timestamp
    const fallbackSlug = `${slug}-${Date.now().toString(36)}`;
    const [retrySet] = await db
      .insert(sets)
      .values({
        title: opts.title,
        slug: fallbackSlug,
        eventId: opts.eventId ?? null,
        performedAt: performedAt ?? null,
        status: "draft",
      })
      .returning({ id: sets.id });
    return retrySet.id;
  }
}

async function createSource(
  setId: string,
  platform: Platform,
  url: string,
  sourceType: "official" | "artist" | "fan"
): Promise<void> {
  const mediaType: MediaType = platform === "youtube" ? "video" : "audio";

  await db.insert(sources).values({
    setId,
    platform,
    url,
    sourceType,
    mediaType,
  });
}
