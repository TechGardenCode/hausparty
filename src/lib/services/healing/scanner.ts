/**
 * Reconciliation scanner.
 *
 * Scans sets for metadata issues by comparing DB state against source
 * metadata. Produces confidence-scored deltas that the reconciler can
 * act on.
 */

import { db } from "@/lib/db";
import { sets, setArtists, setGenres, sources, events, artistGenres } from "@/lib/db/schema";
import { eq, isNull, sql, inArray } from "drizzle-orm";
import { parseYouTubeTitle } from "@/lib/services/normalization/title-parser";

export interface ReconciliationDelta {
  setId: string;
  setTitle: string;
  setStatus: "draft" | "published";
  type: DeltaType;
  confidence: number;
  description: string;
  suggestedFix?: {
    action: string;
    data: Record<string, unknown>;
  };
}

export type DeltaType =
  | "missing_b2b"
  | "missing_genres"
  | "missing_date"
  | "missing_event"
  | "title_mismatch";

/**
 * Scan a single set for metadata deltas.
 */
export async function scanSet(setId: string): Promise<ReconciliationDelta[]> {
  const set = await db.query.sets.findFirst({
    where: eq(sets.id, setId),
    with: {
      setArtists: { with: { artist: true } },
      setGenres: true,
      sources: true,
      event: true,
    },
  });

  if (!set) return [];

  const deltas: ReconciliationDelta[] = [];
  const base = {
    setId: set.id,
    setTitle: set.title,
    setStatus: set.status as "draft" | "published",
  };

  // 1. Missing B2B — check source titles for b2b pattern
  const artistCount = set.setArtists?.length ?? 0;
  if (artistCount <= 1 && set.sources && set.sources.length > 0) {
    for (const source of set.sources) {
      // Re-fetch title via parsing the existing source URL's known title
      // We use the set title as proxy (it was set from OEmbed at creation)
      const parsed = parseYouTubeTitle(set.title);
      if (parsed.b2bArtists && parsed.b2bArtists.length > 0) {
        deltas.push({
          ...base,
          type: "missing_b2b",
          confidence: 0.95,
          description: `Title suggests B2B with: ${parsed.b2bArtists.join(", ")}`,
          suggestedFix: {
            action: "link_artists",
            data: { artistNames: parsed.b2bArtists },
          },
        });
        break; // One B2B delta per set
      }
    }
  }

  // 2. Missing genres — set has 0 genres but its artists have genres
  const genreCount = set.setGenres?.length ?? 0;
  if (genreCount === 0 && artistCount > 0) {
    const artistIds = set.setArtists!.map((sa) => sa.artistId);
    const artistGenreRows = await db
      .select({ genreId: artistGenres.genreId })
      .from(artistGenres)
      .where(inArray(artistGenres.artistId, artistIds));

    if (artistGenreRows.length > 0) {
      const uniqueGenres = [...new Set(artistGenreRows.map((r) => r.genreId))];
      deltas.push({
        ...base,
        type: "missing_genres",
        confidence: 0.95,
        description: `${uniqueGenres.length} genre(s) can be inferred from artist associations`,
        suggestedFix: {
          action: "infer_genres",
          data: { artistIds },
        },
      });
    }
  }

  // 3. Missing date — performedAt is null but linked event has dateStart
  if (!set.performedAt && set.event?.dateStart) {
    deltas.push({
      ...base,
      type: "missing_date",
      confidence: 1.0,
      description: `Missing date, event "${set.event.name}" has date ${set.event.dateStart}`,
      suggestedFix: {
        action: "copy_event_date",
        data: { date: set.event.dateStart, eventId: set.event.id },
      },
    });
  }

  // 4. Missing event link — set has no event but title mentions a known event
  // (lower confidence — fuzzy text matching)
  if (!set.eventId && set.title) {
    const parsed = parseYouTubeTitle(set.title);
    if (parsed.eventOrVenue) {
      // Search for matching events
      const { searchEvents } = await import("@/lib/queries/admin");
      const matchingEvents = await searchEvents(parsed.eventOrVenue);
      if (matchingEvents.length > 0) {
        deltas.push({
          ...base,
          type: "missing_event",
          confidence: 0.6,
          description: `Title mentions "${parsed.eventOrVenue}", possible match: "${matchingEvents[0].name}"`,
          suggestedFix: {
            action: "link_event",
            data: { eventId: matchingEvents[0].id, eventName: matchingEvents[0].name },
          },
        });
      }
    }
  }

  return deltas;
}

/**
 * Scan multiple sets. If no setIds provided, scans sets most likely to have issues.
 */
export async function scanSets(options?: {
  limit?: number;
  setIds?: string[];
}): Promise<ReconciliationDelta[]> {
  const limit = options?.limit ?? 100;

  let targetIds: string[];

  if (options?.setIds) {
    targetIds = options.setIds;
  } else {
    // Find sets likely to have issues:
    // - Sets with 0 or 1 artist
    // - Sets with 0 genres
    // - Sets with no date
    // - Sets with no event
    const candidates = await db
      .select({ id: sets.id })
      .from(sets)
      .leftJoin(setGenres, eq(setGenres.setId, sets.id))
      .where(
        sql`${sets.id} IN (
          SELECT s.id FROM sets s
          LEFT JOIN set_genres sg ON sg.set_id = s.id
          WHERE sg.set_id IS NULL
          UNION
          SELECT s.id FROM sets s
          WHERE s.performed_at IS NULL
          UNION
          SELECT s.id FROM sets s
          WHERE s.event_id IS NULL
          UNION
          SELECT s.id FROM sets s
          WHERE (SELECT COUNT(*) FROM set_artists sa WHERE sa.set_id = s.id) <= 1
        )`
      )
      .limit(limit);

    targetIds = [...new Set(candidates.map((c) => c.id))];
  }

  const allDeltas: ReconciliationDelta[] = [];
  for (const id of targetIds.slice(0, limit)) {
    const deltas = await scanSet(id);
    allDeltas.push(...deltas);
  }

  return allDeltas;
}
