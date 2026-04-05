/**
 * Source type classifier.
 *
 * Determines whether a media source is official, from the artist, or fan-uploaded
 * based on the channel/uploader name compared to known metadata.
 */

import type { SourceType } from "@/lib/db/types";

export interface ClassifyContext {
  channelName: string;
  artistName: string;
  eventName?: string;
  festivalName?: string;
}

/** Known official festival/label YouTube channels. Case-insensitive. */
const OFFICIAL_CHANNELS = new Set([
  "ultra music festival",
  "tomorrowland",
  "insomniac events",
  "electric daisy carnival",
  "cercle",
  "boiler room",
  "mixmag",
  "resident advisor",
  "awakenings",
  "exit festival",
  "defected records",
  "drumcode",
  "anjunadeep",
  "anjunabeats",
  "monstercat",
  "spinnin' records",
  "musical freedom",
  "revealed recordings",
  "armada music",
  "afterlife",
  "mau5trap",
  "dirtybird",
  "owsla",
  "bitbird",
  "deadbeats",
  "night bass",
  "confession",
  "hard recs",
  "lost lands music festival",
  "bass canyon",
  "beyond wonderland",
  "dreamstate",
  "edc",
  "electric forest",
  "coachella",
  "lollapalooza",
  "bonnaroo",
  "movement detroit",
]);

/**
 * Classify a source as official, artist, or fan based on channel metadata.
 */
export function classifySource(ctx: ClassifyContext): SourceType {
  const channelLower = ctx.channelName.toLowerCase().trim();
  const artistLower = ctx.artistName.toLowerCase().trim();

  // Check known official channels
  if (OFFICIAL_CHANNELS.has(channelLower)) {
    return "official";
  }

  // Check if channel name matches a festival/event
  if (ctx.festivalName && fuzzyMatch(channelLower, ctx.festivalName.toLowerCase())) {
    return "official";
  }
  if (ctx.eventName && fuzzyMatch(channelLower, ctx.eventName.toLowerCase())) {
    return "official";
  }

  // Check if channel name matches the artist
  if (fuzzyMatch(channelLower, artistLower)) {
    return "artist";
  }

  // Default
  return "fan";
}

/**
 * Simple fuzzy match: checks if one string contains the other,
 * or if they share significant overlap after stripping common suffixes.
 */
function fuzzyMatch(a: string, b: string): boolean {
  // Strip common YouTube channel suffixes
  const cleanA = stripChannelSuffix(a);
  const cleanB = stripChannelSuffix(b);

  // Direct containment
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) {
    return true;
  }

  // Check without spaces/punctuation
  const normA = cleanA.replace(/[^a-z0-9]/g, "");
  const normB = cleanB.replace(/[^a-z0-9]/g, "");

  if (normA.length > 2 && normB.length > 2) {
    return normA === normB || normA.includes(normB) || normB.includes(normA);
  }

  return false;
}

function stripChannelSuffix(name: string): string {
  return name
    .replace(/\s*(official|music|records|tv|channel|live|vevo)\s*$/i, "")
    .trim();
}
