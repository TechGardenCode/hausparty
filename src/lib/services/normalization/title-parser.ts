/**
 * YouTube / SoundCloud title parser.
 *
 * Extracts structured metadata from DJ set video/audio titles.
 *
 * Common patterns:
 *   "Armin van Buuren live @ Ultra Music Festival 2026 (Full Set)"
 *   "WORSHIP | Red Rocks 2024 | Full Set"
 *   "Boris Brejcha @ Tomorrowland 2023"
 *   "Charlotte de Witte - Cercle Live"
 *   "Fisher b2b Chris Lake @ EDC Las Vegas 2025 [FULL SET]"
 */

export interface ParsedTitle {
  artistName?: string;
  /** Additional artists detected from B2B/b2b patterns. */
  b2bArtists?: string[];
  /** Supporting/lineup artists from comma-separated lists. */
  supportingArtists?: string[];
  eventOrVenue?: string;
  year?: string;
  isFullSet: boolean;
  isLive: boolean;
  cleanTitle: string;
}

const YEAR_RE = /\b(20[0-9]{2})\b/;

/** Markers that indicate a full set recording. Case-insensitive. */
const FULL_SET_MARKERS = [
  "full set",
  "full live set",
  "live set",
  "dj set",
  "full dj set",
  "entire set",
  "complete set",
];

/** Markers to strip from titles (parenthesized or bracketed). */
const STRIP_MARKERS_RE = /\s*[(\[][^)\]]*(?:full set|official|hd|hq|4k|1080p|720p|live|audio|video|official video|official audio|recap|aftermovie)[^)\]]*[)\]]\s*/gi;

/** Reject terms — titles containing primarily these aren't sets. */
const REJECT_TERMS = [
  "reaction", "review", "highlights", "aftermovie", "trailer",
  "interview", "podcast", "behind the scenes", "vlog", "unboxing",
];

/**
 * Separators for "Artist @ Event" style titles, ordered by priority.
 * The `@` and ` at ` patterns are tried first as they're most specific.
 */
const SEPARATOR_PATTERNS: { re: RegExp; name: string }[] = [
  { re: /\s+(?:live\s+)?@\s+/i, name: "at-sign" },
  { re: /\s+live\s+at\s+/i, name: "live-at" },
  { re: /\s+at\s+/i, name: "at" },
  { re: /\s*\|\s*/, name: "pipe" },
  { re: /\s+[-–—]\s+/, name: "dash" },
];

/**
 * Parse a YouTube or SoundCloud title into structured metadata.
 */
export function parseYouTubeTitle(title: string): ParsedTitle {
  let working = title.trim();

  // Extract year before stripping markers
  const yearMatch = working.match(YEAR_RE);
  const year = yearMatch?.[1];

  // Check for full set markers
  const lowerTitle = working.toLowerCase();
  const isFullSet = FULL_SET_MARKERS.some((m) => lowerTitle.includes(m));
  const isLive = /\blive\b/i.test(working);

  // Strip parenthesized/bracketed markers
  working = working.replace(STRIP_MARKERS_RE, " ").trim();

  // Also strip standalone markers at the end
  working = working
    .replace(/\s*[-–—|]\s*(?:Full Set|DJ Set|Live Set|Live|Audio|Video|HD|HQ|4K)\s*$/i, "")
    .trim();

  // Try to split on separators
  for (const { re } of SEPARATOR_PATTERNS) {
    const match = working.match(re);
    if (match && match.index !== undefined) {
      const before = working.slice(0, match.index).trim();
      const after = working.slice(match.index + match[0].length).trim();

      if (before && after) {
        const { primary, b2b } = extractB2B(before);
        const { event, supporting } = extractSupportingArtists(after, year);
        return {
          artistName: cleanArtistPart(primary),
          b2bArtists: b2b.length > 0 ? b2b : undefined,
          supportingArtists: supporting.length > 0 ? supporting : undefined,
          eventOrVenue: event || undefined,
          year,
          isFullSet,
          isLive,
          cleanTitle: working,
        };
      }
    }
  }

  // No separator found — return the whole thing as cleanTitle
  return {
    year,
    isFullSet,
    isLive,
    cleanTitle: working,
  };
}

/**
 * Check if a title is likely a reject (not an actual set).
 */
export function isLikelyReject(title: string): boolean {
  const lower = title.toLowerCase();
  return REJECT_TERMS.some((term) => lower.includes(term));
}

/** Remove year and trailing whitespace/separators from the event portion. */
function cleanEventPart(event: string, year?: string): string {
  let cleaned = event;
  if (year) {
    cleaned = cleaned.replace(new RegExp(`\\b${year}\\b`), "").trim();
  }
  // Remove trailing separators
  cleaned = cleaned.replace(/\s*[-–—|]\s*$/, "").trim();
  // Remove leading/trailing parens
  cleaned = cleaned.replace(/^\(|\)$/g, "").trim();
  return cleaned;
}

/** Clean the artist portion — remove "live" prefix/suffix. */
function cleanArtistPart(artist: string): string {
  return artist
    .replace(/\s*\blive\b\s*/i, " ")
    .trim();
}

/**
 * Extract supporting/lineup artists from the event portion of a title.
 * Pattern: "RED ROCKS 2025 - Sub Focus, Dimension, Culture Shock, 1991"
 * → event = "RED ROCKS", supporting = ["Sub Focus", "Dimension", "Culture Shock", "1991"]
 */
function extractSupportingArtists(
  eventPortion: string,
  year?: string
): { event: string; supporting: string[] } {
  // Look for a secondary dash separator in the event portion
  const dashMatch = eventPortion.match(/\s+[-–—]\s+/);
  if (!dashMatch || dashMatch.index === undefined) {
    return { event: cleanEventPart(eventPortion, year), supporting: [] };
  }

  const beforeDash = eventPortion.slice(0, dashMatch.index).trim();
  const afterDash = eventPortion.slice(dashMatch.index + dashMatch[0].length).trim();

  // The part after the dash should contain commas to be a lineup list
  // (otherwise it's just a subtitle like "Artist - Cercle Live")
  if (!afterDash.includes(",")) {
    return { event: cleanEventPart(eventPortion, year), supporting: [] };
  }

  // Split on commas and clean each entry
  const candidates = afterDash
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    // Filter out non-artist tokens
    .filter((s) => !isNonArtistToken(s, year));

  // Need at least 2 comma-separated items to consider it a lineup
  if (candidates.length < 2) {
    return { event: cleanEventPart(eventPortion, year), supporting: [] };
  }

  return {
    event: cleanEventPart(beforeDash, year),
    supporting: candidates,
  };
}

/** Check if a token is unlikely to be an artist name. */
function isNonArtistToken(token: string, year?: string): boolean {
  const lower = token.toLowerCase();
  if (year && token === year) return false; // Years could be artist names (e.g., "1991")
  return /^(full set|live set|dj set|live|official|hd|hq|4k|audio|video)$/i.test(lower);
}

/** Extract B2B artists from an artist string like "Artist1 b2b Artist2 b2b Artist3". */
function extractB2B(artistPart: string): { primary: string; b2b: string[] } {
  const parts = artistPart.split(/\s+[bB]2[bB]\s+/);
  if (parts.length <= 1) {
    return { primary: artistPart, b2b: [] };
  }
  return {
    primary: parts[0].trim(),
    b2b: parts.slice(1).map((p) => p.trim()).filter(Boolean),
  };
}
