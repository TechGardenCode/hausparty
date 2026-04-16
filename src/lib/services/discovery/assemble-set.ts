import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { detectPlatform } from "@/lib/services/submission-processor";
import { normalizeSourceUrl } from "@/lib/services/url-normalization";
import { fetchYouTubeMetadata } from "@/lib/services/youtube";
import { fetchSoundCloudMetadata } from "@/lib/services/soundcloud";
import { parseYouTubeTitle } from "@/lib/services/normalization/title-parser";
import { classifySource } from "@/lib/services/normalization/source-classifier";
import { inferGenresForSet } from "@/lib/services/normalization/genre-inference";
import { evaluateAndRefreshIfPublished } from "@/lib/services/sets/completeness";
import { findOrLinkSet } from "@/lib/services/sets/find-or-link";
import type { Platform } from "@/lib/db/types";

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

export async function assembleSetFromUrl(
  opts: AssembleOptions
): Promise<AssembleResult> {
  const { url, artistId, artistName, eventId } = opts;

  const platform = detectPlatform(url);
  if (!platform) {
    throw new Error(`Unsupported platform for URL: ${url}`);
  }

  const normalizedUrl = normalizeSourceUrl(url);
  const metadata = await fetchMetadata(normalizedUrl, platform);
  const parsed = metadata ? parseYouTubeTitle(metadata.title) : null;
  const sourceType = metadata
    ? classifySource({
        channelName: metadata.author,
        artistName,
        eventName: parsed?.eventOrVenue,
      })
    : "fan";

  const performedAt = await resolvePerformedAt(opts.performedAt, eventId);
  const titleHint = parsed?.cleanTitle ?? metadata?.title ?? "Untitled Set";

  const link = await findOrLinkSet({
    primaryArtistId: artistId,
    b2bArtistIds: opts.b2bArtistIds,
    eventId,
    performedAt,
    sourceUrl: normalizedUrl,
    platform,
    sourceType,
    titleHint,
  });

  if (link.action === "added_source") {
    // URL already recorded — no state change for the set itself.
    const status = await evaluateAndRefreshIfPublished(link.setId);
    return { setId: link.setId, action: "added_source", status };
  }

  const allArtistIds = [artistId, ...(opts.b2bArtistIds ?? [])];
  await inferGenresForSet(link.setId, allArtistIds);
  const status = await evaluateAndRefreshIfPublished(link.setId);

  const action = link.action === "linked_existing" ? "added_source" : "created";
  return { setId: link.setId, action, status };
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

async function resolvePerformedAt(
  provided: Date | undefined,
  eventId: string | undefined
): Promise<Date | undefined> {
  if (provided) return provided;
  if (!eventId) return undefined;
  const [event] = await db
    .select({ dateStart: events.dateStart })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  return event?.dateStart ? new Date(event.dateStart) : undefined;
}
