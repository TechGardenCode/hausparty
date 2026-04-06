/**
 * Freeform query resolver for manual discovery.
 *
 * Parses admin input like "worship redrocks" or "Tiesto EDC 2024" into
 * structured metadata by matching tokens against the database.
 *
 * Strategy:
 * 1. Extract year (4-digit 2000-2030)
 * 2. Apply known festival/venue aliases
 * 3. Try greedy multi-word token matching against artists, events, festivals
 * 4. Return best resolution with search URLs
 */

import { matchArtist } from "@/lib/services/artist-matching";
import { searchEvents, searchFestivals } from "@/lib/queries/admin";
import { buildSearchUrls, type SearchUrls } from "./search-urls";

const YEAR_RE = /\b(20[0-9]{2})\b/;

/** Known venue/festival shorthand → canonical name for search context. */
const VENUE_ALIASES: Record<string, string> = {
  "redrocks": "Red Rocks",
  "red rocks": "Red Rocks",
  "berghain": "Berghain",
  "space ibiza": "Space Ibiza",
  "hï ibiza": "Hï Ibiza",
  "hi ibiza": "Hï Ibiza",
  "ushuaia": "Ushuaïa Ibiza",
  "printworks": "Printworks London",
  "fabric": "Fabric London",
  "gorge": "The Gorge",
  "msg": "Madison Square Garden",
  "madison square garden": "Madison Square Garden",
};

export interface ResolvedQuery {
  artist?: { id: string; name: string; confidence: "exact" | "fuzzy" | "alias" };
  event?: { id: string; name: string };
  festival?: { id: string; name: string };
  venue?: string;
  year?: string;
  searchUrls: SearchUrls;
  /** Parts of the input that weren't matched to anything. */
  unmatched: string[];
}

/**
 * Resolve a freeform query into structured metadata.
 */
export async function resolveQuery(input: string): Promise<ResolvedQuery> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { searchUrls: buildSearchUrls({ artistName: "" }), unmatched: [] };
  }

  // 1. Extract year
  const yearMatch = trimmed.match(YEAR_RE);
  const year = yearMatch?.[1];
  let remaining = year ? trimmed.replace(YEAR_RE, "").trim() : trimmed;

  // 2. Check venue aliases (consume matched portion)
  let venue: string | undefined;
  const remainingLower = remaining.toLowerCase();
  for (const [alias, canonical] of Object.entries(VENUE_ALIASES)) {
    if (remainingLower.includes(alias)) {
      venue = canonical;
      remaining = remaining.replace(new RegExp(escapeRegex(alias), "i"), "").trim();
      break;
    }
  }

  // 3. Tokenize remaining into words
  const words = remaining.split(/\s+/).filter(Boolean);

  // 4. Try greedy matching — longest sequences first
  let artist: ResolvedQuery["artist"];
  let event: ResolvedQuery["event"];
  let festival: ResolvedQuery["festival"];
  const consumed = new Set<number>();

  // Try matching all words, then progressively shorter sequences
  for (let len = words.length; len >= 1; len--) {
    for (let start = 0; start <= words.length - len; start++) {
      // Skip if any word in this range is already consumed
      const indices = Array.from({ length: len }, (_, i) => start + i);
      if (indices.some((i) => consumed.has(i))) continue;

      const phrase = indices.map((i) => words[i]).join(" ");

      // Try artist match first (most common query intent)
      if (!artist) {
        const artistMatch = await matchArtist(phrase);
        if (artistMatch) {
          const artistName = await getArtistName(artistMatch.artistId);
          if (artistName) {
            artist = {
              id: artistMatch.artistId,
              name: artistName,
              confidence: artistMatch.confidence,
            };
            indices.forEach((i) => consumed.add(i));
            continue;
          }
        }
      }

      // Try event match
      if (!event && phrase.length >= 3) {
        const events = await searchEvents(phrase);
        if (events.length > 0) {
          event = { id: events[0].id, name: events[0].name };
          if (events[0].festivals) {
            festival = { id: events[0].festivals.id, name: events[0].festivals.name };
          }
          indices.forEach((i) => consumed.add(i));
          continue;
        }
      }

      // Try festival match
      if (!festival && phrase.length >= 3) {
        const festivals = await searchFestivals(phrase);
        if (festivals.length > 0) {
          festival = { id: festivals[0].id, name: festivals[0].name };
          indices.forEach((i) => consumed.add(i));
          continue;
        }
      }
    }
  }

  // Collect unmatched words
  const unmatched = words.filter((_, i) => !consumed.has(i));

  // Build search URLs from resolution
  const searchUrls = buildSearchUrls({
    artistName: artist?.name ?? unmatched.join(" ") ?? trimmed,
    eventName: event?.name,
    festivalName: festival?.name,
    venue,
    year,
  });

  return { artist, event, festival, venue, year, searchUrls, unmatched };
}

// Import db lazily to avoid circular deps
async function getArtistName(artistId: string): Promise<string | null> {
  const { db } = await import("@/lib/db");
  const { artists } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const [row] = await db
    .select({ name: artists.name })
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1);

  return row?.name ?? null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
