/**
 * Event name normalization.
 *
 * Handles:
 * - Festival abbreviations → full names (EDC → Electric Daisy Carnival)
 * - Year extraction from name or date
 * - Canonical event naming: "{Festival} {Location} {Year}"
 * - Non-festival events preserved as-is
 */

export interface NormalizedEventName {
  displayName: string;
  festivalName?: string;
  year?: string;
  location?: string;
}

/** Festival abbreviation → canonical name. Case-insensitive lookup key. */
const FESTIVAL_ALIASES: Record<string, string> = {
  "edc": "Electric Daisy Carnival",
  "edc las vegas": "Electric Daisy Carnival",
  "edc lv": "Electric Daisy Carnival",
  "edc orlando": "Electric Daisy Carnival",
  "edc mexico": "Electric Daisy Carnival",
  "ultra": "Ultra Music Festival",
  "umf": "Ultra Music Festival",
  "ultra miami": "Ultra Music Festival",
  "tomorrowland": "Tomorrowland",
  "tml": "Tomorrowland",
  "coachella": "Coachella",
  "eforest": "Electric Forest",
  "electric forest": "Electric Forest",
  "ezoo": "Electric Zoo",
  "electric zoo": "Electric Zoo",
  "lolla": "Lollapalooza",
  "lollapalooza": "Lollapalooza",
  "bonnaroo": "Bonnaroo",
  "lost lands": "Lost Lands",
  "bass canyon": "Bass Canyon",
  "beyond wonderland": "Beyond Wonderland",
  "nocturnal wonderland": "Nocturnal Wonderland",
  "escape": "Escape Halloween",
  "dreamstate": "Dreamstate",
  "countdown": "Countdown NYE",
  "hard summer": "HARD Summer",
  "crssd": "CRSSD Festival",
  "movement": "Movement",
  "ade": "Amsterdam Dance Event",
  "sonar": "Sónar",
  "awakenings": "Awakenings",
  "time warp": "Time Warp",
  "defqon": "Defqon.1",
  "defqon.1": "Defqon.1",
  "mysteryland": "Mysteryland",
  "burning man": "Burning Man",
  "shambhala": "Shambhala",
  "lightning in a bottle": "Lightning in a Bottle",
  "lib": "Lightning in a Bottle",
  "edc japan": "Electric Daisy Carnival",
};

/** Known location suffixes for festivals. */
const FESTIVAL_LOCATIONS: Record<string, string> = {
  "Electric Daisy Carnival": "Las Vegas",
  "Ultra Music Festival": "Miami",
  "Tomorrowland": "Boom",
  "Coachella": "Indio",
  "Electric Forest": "Rothbury",
  "Lollapalooza": "Chicago",
  "Bonnaroo": "Manchester",
  "Lost Lands": "Legend Valley",
  "Bass Canyon": "The Gorge",
  "Movement": "Detroit",
};

const YEAR_RE = /\b(20[0-9]{2})\b/;

/**
 * Normalize an event name into canonical form.
 *
 * @param raw - Raw event name from scraper or user input
 * @param festivalName - Optional festival name for context
 * @param date - Optional ISO date string (YYYY-MM-DD) to extract year
 */
export function normalizeEventName(
  raw: string,
  festivalName?: string,
  date?: string
): NormalizedEventName {
  const trimmed = raw.trim();
  if (!trimmed) return { displayName: trimmed };

  // Extract year from the name or fall back to the date
  const yearMatch = trimmed.match(YEAR_RE);
  const year = yearMatch?.[1] ?? (date ? date.slice(0, 4) : undefined);

  // Check if the name (or festival hint) maps to a known festival
  const resolvedFestival = resolveFestival(trimmed, festivalName);

  if (resolvedFestival) {
    const location = extractLocation(trimmed, resolvedFestival) ??
      FESTIVAL_LOCATIONS[resolvedFestival];

    const parts = [resolvedFestival];
    if (location) parts.push(location);
    if (year) parts.push(year);

    return {
      displayName: parts.join(" "),
      festivalName: resolvedFestival,
      year,
      location,
    };
  }

  // Not a known festival — return cleaned up original
  return {
    displayName: trimmed,
    year,
  };
}

function resolveFestival(name: string, festivalHint?: string): string | null {
  // Try the festival hint first (from scraper metadata)
  if (festivalHint) {
    const hintLower = festivalHint.trim().toLowerCase();
    if (FESTIVAL_ALIASES[hintLower]) return FESTIVAL_ALIASES[hintLower];
  }

  // Try matching the event name against aliases
  const nameLower = name.toLowerCase();

  // Try exact match first
  if (FESTIVAL_ALIASES[nameLower]) return FESTIVAL_ALIASES[nameLower];

  // Try without year
  const nameNoYear = nameLower.replace(YEAR_RE, "").trim();
  if (FESTIVAL_ALIASES[nameNoYear]) return FESTIVAL_ALIASES[nameNoYear];

  // Try each alias as a prefix
  for (const [alias, canonical] of Object.entries(FESTIVAL_ALIASES)) {
    if (nameLower.startsWith(alias + " ") || nameLower === alias) {
      return canonical;
    }
  }

  return null;
}

/**
 * Extract a location from the event name that isn't the festival name or year.
 * e.g., "EDC Orlando 2025" → "Orlando"
 */
function extractLocation(name: string, festivalName: string): string | null {
  // Remove festival name and year from the string
  let remaining = name;

  // Remove known festival alias matches
  for (const alias of Object.keys(FESTIVAL_ALIASES)) {
    const re = new RegExp(`\\b${escapeRegex(alias)}\\b`, "i");
    remaining = remaining.replace(re, "");
  }

  // Remove year
  remaining = remaining.replace(YEAR_RE, "");

  // Clean up separators and whitespace
  remaining = remaining.replace(/[-–—|:,]/g, " ").trim().replace(/\s+/g, " ");

  if (remaining && remaining.length > 1 && remaining.length < 40) {
    // Capitalize first letter of each word
    return remaining
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
