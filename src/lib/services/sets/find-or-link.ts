import { db } from "@/lib/db";
import {
  sets,
  setArtists,
  sources,
  artists,
} from "@/lib/db/schema";
import { eq, and, isNull, gte, lte, sql } from "drizzle-orm";
import { slugify } from "@/lib/utils";
import type { Platform, SourceType, MediaType } from "@/lib/db/types";

export interface FindOrLinkInput {
  primaryArtistId: string;
  b2bArtistIds?: string[];
  eventId?: string;
  performedAt?: Date;
  sourceUrl: string;
  platform: Platform;
  sourceType: SourceType;
  titleHint?: string;
}

export type MatchReason =
  | "url"
  | "artist_event"
  | "artist_date"
  | "title_candidate"
  | "new";

export interface FindOrLinkResult {
  setId: string;
  action: "created" | "linked_existing" | "added_source";
  matchReason: MatchReason;
  confidence: number;
  mergeCandidateFor?: string;
}

const DATE_FUZZY_WINDOW_MS = 24 * 60 * 60 * 1000;
const TITLE_TRIGRAM_THRESHOLD = 0.75;

/**
 * Unified dedup cascade for both the discovery path (assemble-set) and the
 * submission-processor path. Never creates duplicate (artist, event) sets
 * or duplicate (artist, date±1d) sets; near-title matches without event/date
 * evidence produce a new set flagged for admin review rather than auto-linking.
 */
export async function findOrLinkSet(
  input: FindOrLinkInput
): Promise<FindOrLinkResult> {
  const mediaType: MediaType = input.platform === "youtube" ? "video" : "audio";
  const allArtistIds = [
    input.primaryArtistId,
    ...(input.b2bArtistIds ?? []),
  ];

  // Step 1: URL already recorded → added_source
  const existingByUrl = await findSetBySourceUrl(input.sourceUrl);
  if (existingByUrl) {
    return {
      setId: existingByUrl,
      action: "added_source",
      matchReason: "url",
      confidence: 1.0,
    };
  }

  // Step 2: hard (artist, event) match
  if (input.eventId) {
    const eventMatch = await findSetByArtistAndEvent(
      input.primaryArtistId,
      input.eventId
    );
    if (eventMatch) {
      await insertSourceRow(eventMatch, input, mediaType);
      await enrichLineup(eventMatch, allArtistIds);
      return {
        setId: eventMatch,
        action: "linked_existing",
        matchReason: "artist_event",
        confidence: 1.0,
      };
    }
  }

  // Step 3: fuzzy (artist, date ±1 day)
  if (input.performedAt) {
    const dateMatch = await findSetByArtistAndDate(
      input.primaryArtistId,
      input.performedAt
    );
    if (dateMatch) {
      await insertSourceRow(dateMatch, input, mediaType);
      await enrichLineup(dateMatch, allArtistIds);
      return {
        setId: dateMatch,
        action: "linked_existing",
        matchReason: "artist_date",
        confidence: 0.85,
      };
    }
  }

  // Step 4: title trigram → NEVER auto-links; creates a new set flagged as a
  // merge candidate so admin can decide via the plan-10 merge tool.
  let mergeCandidateFor: string | undefined;
  if (input.titleHint && input.titleHint.trim().length > 0) {
    const trigramCandidate = await findTitleTrigramCandidate(
      input.primaryArtistId,
      input.titleHint
    );
    if (trigramCandidate) {
      mergeCandidateFor = trigramCandidate;
    }
  }

  // Step 5 (or "new"): create a new draft set
  const newSetId = await createSetWithLineup({
    input,
    allArtistIds,
    mediaType,
    mergeCandidateFor,
  });
  return {
    setId: newSetId,
    action: "created",
    matchReason: mergeCandidateFor ? "title_candidate" : "new",
    confidence: 0,
    mergeCandidateFor,
  };
}

// ------- Match queries -------

async function findSetBySourceUrl(url: string): Promise<string | null> {
  const [row] = await db
    .select({ setId: sources.setId })
    .from(sources)
    .where(eq(sources.url, url))
    .limit(1);
  return row?.setId ?? null;
}

async function findSetByArtistAndEvent(
  artistId: string,
  eventId: string
): Promise<string | null> {
  const [row] = await db
    .select({ setId: setArtists.setId })
    .from(setArtists)
    .innerJoin(sets, eq(sets.id, setArtists.setId))
    .where(
      and(
        eq(setArtists.artistId, artistId),
        eq(sets.eventId, eventId),
        isNull(sets.mergeCandidateFor)
      )
    )
    .limit(1);
  return row?.setId ?? null;
}

async function findSetByArtistAndDate(
  artistId: string,
  performedAt: Date
): Promise<string | null> {
  const lower = new Date(performedAt.getTime() - DATE_FUZZY_WINDOW_MS);
  const upper = new Date(performedAt.getTime() + DATE_FUZZY_WINDOW_MS);
  const [row] = await db
    .select({ setId: setArtists.setId })
    .from(setArtists)
    .innerJoin(sets, eq(sets.id, setArtists.setId))
    .where(
      and(
        eq(setArtists.artistId, artistId),
        gte(sets.performedAt, lower),
        lte(sets.performedAt, upper),
        isNull(sets.mergeCandidateFor)
      )
    )
    .orderBy(sql`ABS(EXTRACT(EPOCH FROM (${sets.performedAt} - ${performedAt.toISOString()}::timestamptz)))`)
    .limit(1);
  return row?.setId ?? null;
}

async function findTitleTrigramCandidate(
  artistId: string,
  titleHint: string
): Promise<string | null> {
  const rows = await db.execute<{ id: string }>(sql`
    SELECT s.id
    FROM sets s
    JOIN set_artists sa ON sa.set_id = s.id
    WHERE sa.artist_id = ${artistId}::uuid
      AND s.merge_candidate_for IS NULL
      AND similarity(s.title, ${titleHint}) >= ${TITLE_TRIGRAM_THRESHOLD}
    ORDER BY similarity(s.title, ${titleHint}) DESC
    LIMIT 1
  `);
  return rows[0]?.id ?? null;
}

// ------- Mutations -------

async function insertSourceRow(
  setId: string,
  input: FindOrLinkInput,
  mediaType: MediaType
): Promise<void> {
  await db.insert(sources).values({
    setId,
    platform: input.platform,
    url: input.sourceUrl,
    sourceType: input.sourceType,
    mediaType,
  });
}

/**
 * Adds any artistIds not yet associated with setId. Used when linking a new
 * source to an existing set: the new submission may include B2B artists the
 * original lineup missed.
 */
async function enrichLineup(
  setId: string,
  allArtistIds: string[]
): Promise<void> {
  const existing = await db
    .select({ artistId: setArtists.artistId })
    .from(setArtists)
    .where(eq(setArtists.setId, setId));
  const already = new Set(existing.map((r) => r.artistId));

  let nextPosition = existing.length;
  for (const artistId of allArtistIds) {
    if (already.has(artistId)) continue;
    await db
      .insert(setArtists)
      .values({ setId, artistId, position: nextPosition })
      .onConflictDoNothing();
    nextPosition++;
  }
}

interface CreateSetOpts {
  input: FindOrLinkInput;
  allArtistIds: string[];
  mediaType: MediaType;
  mergeCandidateFor?: string;
}

async function createSetWithLineup(opts: CreateSetOpts): Promise<string> {
  const { input, allArtistIds, mediaType, mergeCandidateFor } = opts;

  const [primaryArtist] = await db
    .select({ name: artists.name })
    .from(artists)
    .where(eq(artists.id, input.primaryArtistId))
    .limit(1);
  const artistName = primaryArtist?.name ?? "unknown";
  const title = input.titleHint?.trim() || "Untitled Set";
  const baseSlug = slugify(`${artistName}-${title}`);

  const setId = await insertSetWithSlugFallback({
    title,
    baseSlug,
    eventId: input.eventId,
    performedAt: input.performedAt,
    mergeCandidateFor,
  });

  await db.insert(sources).values({
    setId,
    platform: input.platform,
    url: input.sourceUrl,
    sourceType: input.sourceType,
    mediaType,
  });

  for (let i = 0; i < allArtistIds.length; i++) {
    await db
      .insert(setArtists)
      .values({ setId, artistId: allArtistIds[i], position: i })
      .onConflictDoNothing();
  }

  return setId;
}

async function insertSetWithSlugFallback(opts: {
  title: string;
  baseSlug: string;
  eventId?: string;
  performedAt?: Date;
  mergeCandidateFor?: string;
}): Promise<string> {
  try {
    const [row] = await db
      .insert(sets)
      .values({
        title: opts.title,
        slug: opts.baseSlug,
        eventId: opts.eventId ?? null,
        performedAt: opts.performedAt ?? null,
        status: "draft",
        mergeCandidateFor: opts.mergeCandidateFor ?? null,
      })
      .returning({ id: sets.id });
    return row.id;
  } catch {
    const fallbackSlug = `${opts.baseSlug}-${Date.now().toString(36)}`;
    const [row] = await db
      .insert(sets)
      .values({
        title: opts.title,
        slug: fallbackSlug,
        eventId: opts.eventId ?? null,
        performedAt: opts.performedAt ?? null,
        status: "draft",
        mergeCandidateFor: opts.mergeCandidateFor ?? null,
      })
      .returning({ id: sets.id });
    return row.id;
  }
}
