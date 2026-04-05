/**
 * Search URL builder for content discovery.
 *
 * Generates clickable YouTube and SoundCloud search URLs from metadata context.
 * Admin clicks these to manually find set recordings.
 */

export interface SearchContext {
  artistName: string;
  eventName?: string;
  festivalName?: string;
  venue?: string;
  year?: string;
}

export interface SearchUrls {
  youtube: string[];
  soundcloud: string[];
}

const YT_BASE = "https://www.youtube.com/results";
const SC_BASE = "https://soundcloud.com/search";

/**
 * Build search URLs for YouTube and SoundCloud.
 *
 * YouTube strategies (most specific first):
 * 1. Quoted artist + festival/event + year + "live set"
 * 2. Unquoted artist + event/venue + year + "full set"
 * 3. Venue-based fallback (if venue differs from event)
 *
 * SoundCloud: simple unquoted query.
 */
export function buildSearchUrls(ctx: SearchContext): SearchUrls {
  const youtube: string[] = [];
  const soundcloud: string[] = [];

  const { artistName, eventName, festivalName, venue, year } = ctx;
  const eventOrFestival = festivalName ?? eventName;

  // YouTube strategy 1: quoted specific
  if (eventOrFestival) {
    const parts = [`"${artistName}"`, `"${eventOrFestival}"`];
    if (year) parts.push(year);
    parts.push("live set");
    youtube.push(ytUrl(parts.join(" ")));
  }

  // YouTube strategy 2: unquoted relaxed
  {
    const parts = [artistName];
    if (eventOrFestival) parts.push(eventOrFestival);
    else if (venue) parts.push(venue);
    if (year) parts.push(year);
    parts.push("full set");
    youtube.push(ytUrl(parts.join(" ")));
  }

  // YouTube strategy 3: venue fallback (if venue is different from event)
  if (venue && venue !== eventOrFestival) {
    const parts = [artistName, venue];
    if (year) parts.push(year);
    parts.push("DJ set");
    youtube.push(ytUrl(parts.join(" ")));
  }

  // SoundCloud: simple query
  {
    const parts = [artistName];
    if (eventOrFestival) parts.push(eventOrFestival);
    if (year) parts.push(year);
    soundcloud.push(scUrl(parts.join(" ")));
  }

  return { youtube, soundcloud };
}

function ytUrl(query: string): string {
  const params = new URLSearchParams({ search_query: query });
  return `${YT_BASE}?${params.toString()}`;
}

function scUrl(query: string): string {
  const params = new URLSearchParams({ q: query });
  return `${SC_BASE}?${params.toString()}`;
}
