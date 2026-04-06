"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-helpers";
import { assembleSetFromUrl } from "@/lib/services/discovery/assemble-set";
import { detectPlatform } from "@/lib/services/submission-processor";
import { normalizeSourceUrl } from "@/lib/services/url-normalization";
import { fetchYouTubeMetadata } from "@/lib/services/youtube";
import { fetchSoundCloudMetadata } from "@/lib/services/soundcloud";
import { parseYouTubeTitle } from "@/lib/services/normalization/title-parser";
import { classifySource } from "@/lib/services/normalization/source-classifier";
import { crossValidate } from "@/lib/services/discovery/cross-validate";
import { findOrCreateArtist } from "@/lib/services/artist-matching";
import { normalizeArtistName } from "@/lib/services/normalization/artist-names";
import { resolveQuery, type ResolvedQuery } from "@/lib/services/discovery/resolve-query";
import { slugify } from "@/lib/utils";
import { db } from "@/lib/db";
import { artists, events, sources, eventArtists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { CrossValidationResult } from "@/lib/services/discovery/cross-validate";

export interface PreviewResult {
  url: string;
  normalizedUrl: string;
  platform: string;
  isDuplicate: boolean;
  title: string;
  channelName: string;
  thumbnailUrl: string | null;
  parsedArtist: string | null;
  parsedEvent: string | null;
  parsedYear: string | null;
  isFullSet: boolean;
  sourceType: "official" | "artist" | "fan";
  validation: CrossValidationResult;
}

/**
 * Preview a URL before creating a set. Fetches metadata, parses the title,
 * and cross-validates against the discovery queue context.
 */
export async function previewSetFromUrl(data: {
  url: string;
  artistId: string;
  artistName: string;
  eventName?: string;
  festivalName?: string;
}): Promise<PreviewResult> {
  await requireAdmin();

  const platform = detectPlatform(data.url);
  if (!platform) {
    throw new Error("Unsupported platform. Only YouTube and SoundCloud URLs are supported.");
  }

  const normalizedUrl = normalizeSourceUrl(data.url);

  // Check for duplicates
  const [existing] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.url, normalizedUrl))
    .limit(1);

  // Fetch OEmbed metadata
  let title = "Unknown";
  let channelName = "Unknown";
  let thumbnailUrl: string | null = null;

  try {
    const metadata = platform === "youtube"
      ? await fetchYouTubeMetadata(normalizedUrl)
      : await fetchSoundCloudMetadata(normalizedUrl);
    if (metadata) {
      title = metadata.title;
      channelName = metadata.author;
      thumbnailUrl = metadata.thumbnailUrl ?? null;
    }
  } catch {
    // Non-fatal
  }

  // Parse title
  const parsed = parseYouTubeTitle(title);

  // Classify source
  const sourceType = classifySource({
    channelName,
    artistName: data.artistName,
    eventName: data.eventName,
    festivalName: data.festivalName,
  });

  // Cross-validate
  const validation = crossValidate(parsed, {
    artistName: data.artistName,
    eventName: data.eventName,
    festivalName: data.festivalName,
  });

  return {
    url: data.url,
    normalizedUrl,
    platform,
    isDuplicate: !!existing,
    title,
    channelName,
    thumbnailUrl,
    parsedArtist: parsed.artistName ?? null,
    parsedEvent: parsed.eventOrVenue ?? null,
    parsedYear: parsed.year ?? null,
    isFullSet: parsed.isFullSet,
    sourceType,
    validation,
  };
}

/**
 * Create a set from a previewed URL, optionally applying B2B suggestions.
 */
export async function createSetFromDiscovery(data: {
  url: string;
  artistId: string;
  eventId?: string;
  performedAt?: string;
  b2bArtistNames?: string[];
}): Promise<{ setId: string; action: string; status: string }> {
  await requireAdmin();

  const [artist] = await db
    .select({ name: artists.name })
    .from(artists)
    .where(eq(artists.id, data.artistId))
    .limit(1);

  if (!artist) {
    throw new Error("Artist not found");
  }

  // Resolve B2B artists if provided
  const b2bArtistIds: string[] = [];
  if (data.b2bArtistNames && data.b2bArtistNames.length > 0) {
    for (const name of data.b2bArtistNames) {
      const { artistId } = await findOrCreateArtist(normalizeArtistName(name));
      b2bArtistIds.push(artistId);
    }
  }

  const result = await assembleSetFromUrl({
    url: data.url,
    artistId: data.artistId,
    artistName: artist.name,
    eventId: data.eventId,
    performedAt: data.performedAt ? new Date(data.performedAt) : undefined,
    b2bArtistIds,
  });

  revalidatePath("/admin/discovery");
  revalidatePath("/admin/sets");
  revalidatePath("/admin");

  return { setId: result.setId, action: result.action, status: result.status };
}

/**
 * Resolve a freeform query into structured metadata.
 */
export async function resolveDiscoveryQuery(input: string): Promise<ResolvedQuery> {
  await requireAdmin();
  return resolveQuery(input);
}

/**
 * Create an artist inline from the manual discovery flow.
 */
export async function createDiscoveryArtist(name: string): Promise<{ id: string; name: string }> {
  await requireAdmin();
  const normalized = normalizeArtistName(name);
  const { artistId } = await findOrCreateArtist(normalized);

  const [artist] = await db
    .select({ name: artists.name })
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1);

  revalidatePath("/admin/discovery");
  return { id: artistId, name: artist?.name ?? normalized };
}

/**
 * Create an event inline from the manual discovery flow.
 * Optionally links to a festival and creates an event_artists association.
 */
export async function createDiscoveryEvent(data: {
  name: string;
  festivalId?: string;
  dateStart?: string;
  venue?: string;
  artistId?: string;
}): Promise<{ id: string; name: string }> {
  await requireAdmin();

  const slug = slugify(data.name);

  let eventId: string;
  try {
    const [newEvent] = await db
      .insert(events)
      .values({
        name: data.name,
        slug,
        festivalId: data.festivalId ?? null,
        dateStart: data.dateStart ?? null,
        venue: data.venue ?? null,
      })
      .returning({ id: events.id });
    eventId = newEvent.id;
  } catch {
    const fallbackSlug = `${slug}-${Date.now().toString(36)}`;
    const [retryEvent] = await db
      .insert(events)
      .values({
        name: data.name,
        slug: fallbackSlug,
        festivalId: data.festivalId ?? null,
        dateStart: data.dateStart ?? null,
        venue: data.venue ?? null,
      })
      .returning({ id: events.id });
    eventId = retryEvent.id;
  }

  // If an artist was provided, link them to the event
  if (data.artistId) {
    await db
      .insert(eventArtists)
      .values({ eventId, artistId: data.artistId })
      .onConflictDoNothing();
  }

  revalidatePath("/admin/discovery");
  return { id: eventId, name: data.name };
}
