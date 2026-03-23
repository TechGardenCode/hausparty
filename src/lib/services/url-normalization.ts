/**
 * URL normalization for deduplication.
 * Canonicalizes YouTube and SoundCloud URLs so that different URL formats
 * for the same content are recognized as duplicates.
 */

const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "si",
  "ref",
];

/**
 * Extract a YouTube video ID from various URL formats.
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/v\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:m\.youtube\.com\/watch\?.*v=)([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Normalize a SoundCloud URL by stripping query params and standardizing the path.
 */
function normalizeSoundCloud(url: string): string {
  try {
    const parsed = new URL(url);
    // Normalize host
    parsed.hostname = "soundcloud.com";
    parsed.protocol = "https:";
    // Strip all query params
    parsed.search = "";
    parsed.hash = "";
    // Remove trailing slash
    const path = parsed.pathname.replace(/\/+$/, "");
    return `https://soundcloud.com${path}`;
  } catch {
    return url;
  }
}

/**
 * Strip tracking params from a generic URL.
 */
function stripTrackingParams(url: string): string {
  try {
    const parsed = new URL(url);
    for (const param of TRACKING_PARAMS) {
      parsed.searchParams.delete(param);
    }
    // Also strip any utm_* params we didn't explicitly list
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.startsWith("utm_")) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.protocol = "https:";
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Normalize a source URL to a canonical form for deduplication.
 *
 * - YouTube: extracts video ID → `https://www.youtube.com/watch?v={id}`
 * - SoundCloud: strips query params → `https://soundcloud.com/{user}/{track}`
 * - Other: strips tracking params, normalizes to https
 */
export function normalizeSourceUrl(url: string): string {
  // YouTube
  const ytId = extractYouTubeId(url);
  if (ytId) {
    return `https://www.youtube.com/watch?v=${ytId}`;
  }

  // SoundCloud
  if (url.includes("soundcloud.com")) {
    return normalizeSoundCloud(url);
  }

  // General: strip tracking params
  return stripTrackingParams(url);
}
