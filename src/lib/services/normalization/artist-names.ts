/**
 * Artist name normalization for consistent display across sources.
 *
 * Handles:
 * - ALL CAPS from scrapers → smart title case
 * - Stylized names (deadmau5, REZZ, ZHU) → preserved as-is
 * - "DJ " prefix consistency
 * - Lowercase particles (van, von, de, of, the)
 */

/** Names with intentional non-standard casing. Case-insensitive lookup. */
const STYLIZED_NAMES: Record<string, string> = {
  "deadmau5": "deadmau5",
  "rezz": "REZZ",
  "zhu": "ZHU",
  "i_o": "i_o",
  "odesza": "ODESZA",
  "rüfüs du sol": "RÜFÜS DU SOL",
  "rufus du sol": "RÜFÜS DU SOL",
  "ac slater": "AC Slater",
  "atb": "ATB",
  "rl grime": "RL Grime",
  "dj snake": "DJ Snake",
  "dj shadow": "DJ Shadow",
  "lsdream": "LSDREAM",
  "nghtmre": "NGHTMRE",
  "slander": "SLANDER",
  "svdden death": "SVDDEN DEATH",
  "k?d": "k?d",
  "illenium": "Illenium",
  "excision": "Excision",
  "subtronics": "Subtronics",
  "jauz": "Jauz",
  "said the sky": "Said The Sky",
  "mitis": "MitiS",
  "au5": "Au5",
  "notlo": "NOTLO",
  "g jones": "G Jones",
  "j. worra": "J. Worra",
  "lp giobbi": "LP Giobbi",
  "vnssa": "VNSSA",
  "mau5trap": "mau5trap",
  "testpilot": "Testpilot",
  "cirez d": "Cirez D",
  "eric prydz": "Eric Prydz",
  "fisher": "FISHER",
  "tchami": "Tchami",
  "malaa": "Malaa",
  "4b": "4B",
  "3lau": "3LAU",
  "a-trak": "A-Trak",
  "z-trip": "Z-Trip",
  "cr7z": "Cr7z",
  "boys noize": "Boys Noize",
  "gesaffelstein": "Gesaffelstein",
  "kai wachi": "Kai Wachi",
  "wooli": "Wooli",
  "riot ten": "Riot Ten",
  "herobust": "HeRobust",
  "tisoki": "Tisoki",
  "eprom": "EPROM",
  "g-rex": "G-Rex",
  "two friends": "Two Friends",
  "dj diesel": "DJ Diesel",
  "dillon francis": "Dillon Francis",
  "diplo": "Diplo",
  "skrillex": "Skrillex",
  "tiesto": "Tiësto",
  "tiësto": "Tiësto",
  "avicii": "Avicii",
  "alesso": "Alesso",
  "zedd": "Zedd",
  "marshmello": "Marshmello",
  "kygo": "Kygo",
  "flume": "Flume",
  "disclosure": "Disclosure",
  "above & beyond": "Above & Beyond",
  "armin van buuren": "Armin van Buuren",
  "carl cox": "Carl Cox",
  "adam beyer": "Adam Beyer",
  "charlotte de witte": "Charlotte de Witte",
  "amelie lens": "Amelie Lens",
  "boris brejcha": "Boris Brejcha",
  "tale of us": "Tale Of Us",
  "nina kraviz": "Nina Kraviz",
  "richie hawtin": "Richie Hawtin",
  "solomun": "Solomun",
  "black coffee": "Black Coffee",
  "john digweed": "John Digweed",
  "claude vonstroke": "Claude VonStroke",
  "green velvet": "Green Velvet",
  "chris lake": "Chris Lake",
  "john summit": "John Summit",
  "dom dolla": "Dom Dolla",
  "fred again": "Fred again..",
  "fred again..": "Fred again..",
  "four tet": "Four Tet",
  "bicep": "Bicep",
  "ben böhmer": "Ben Böhmer",
  "ben bohmer": "Ben Böhmer",
  "rufus": "RÜFÜS DU SOL",
};

/** Words that stay lowercase unless they start the name. */
const LOWERCASE_PARTICLES = new Set([
  "van", "von", "de", "del", "der", "di", "du", "la", "le",
  "of", "the", "and", "vs", "vs.",
]);

/**
 * Normalize an artist display name for consistent presentation.
 */
export function normalizeArtistName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;

  // Check stylized names (case-insensitive)
  const stylized = STYLIZED_NAMES[trimmed.toLowerCase()];
  if (stylized) return stylized;

  // If already mixed case (not ALL CAPS and not all lowercase), preserve it
  if (!isAllCaps(trimmed) && !isAllLower(trimmed)) {
    return trimmed;
  }

  // Apply smart title case
  return smartTitleCase(trimmed);
}

function isAllCaps(s: string): boolean {
  const letters = s.replace(/[^a-zA-Z]/g, "");
  return letters.length > 1 && letters === letters.toUpperCase();
}

function isAllLower(s: string): boolean {
  const letters = s.replace(/[^a-zA-Z]/g, "");
  return letters.length > 1 && letters === letters.toLowerCase();
}

function smartTitleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((word, i) => {
      // First word always capitalized
      if (i === 0) return capitalizeFirst(word);
      // Particles stay lowercase
      if (LOWERCASE_PARTICLES.has(word)) return word;
      return capitalizeFirst(word);
    })
    .join(" ");
}

function capitalizeFirst(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}
