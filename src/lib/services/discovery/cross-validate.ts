/**
 * Cross-validation service.
 *
 * Compares parsed title metadata from a media URL against the discovery
 * queue context (expected artist + event). Produces warnings when they
 * diverge, and suggestions for enrichment (B2B artists, etc.).
 */

import type { ParsedTitle } from "@/lib/services/normalization/title-parser";

export interface ValidationContext {
  artistName: string;
  eventName?: string;
  festivalName?: string;
}

export interface ValidationWarning {
  type: "b2b_detected" | "artist_mismatch" | "event_mismatch";
  message: string;
  severity: "info" | "warning";
}

export interface ValidationSuggestion {
  type: "add_b2b_artist";
  artistName: string;
}

export interface CrossValidationResult {
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  confidence: number; // 0.0-1.0 — how well the media matches the context
}

/**
 * Cross-validate parsed title metadata against expected context.
 */
export function crossValidate(
  parsed: ParsedTitle,
  context: ValidationContext
): CrossValidationResult {
  const warnings: ValidationWarning[] = [];
  const suggestions: ValidationSuggestion[] = [];
  let confidence = 1.0;

  // B2B detection
  if (parsed.b2bArtists && parsed.b2bArtists.length > 0) {
    warnings.push({
      type: "b2b_detected",
      message: `B2B set detected: ${parsed.artistName} b2b ${parsed.b2bArtists.join(" b2b ")}`,
      severity: "info",
    });
    for (const artist of parsed.b2bArtists) {
      suggestions.push({ type: "add_b2b_artist", artistName: artist });
    }
  }

  // Artist mismatch — parsed artist doesn't match expected
  if (parsed.artistName && context.artistName) {
    if (!fuzzyContains(parsed.artistName, context.artistName)) {
      warnings.push({
        type: "artist_mismatch",
        message: `Expected "${context.artistName}" but video title shows "${parsed.artistName}"`,
        severity: "warning",
      });
      confidence -= 0.3;
    }
  }

  // Event mismatch — parsed event doesn't match expected
  if (parsed.eventOrVenue && context.eventName) {
    const eventMatch = fuzzyContains(parsed.eventOrVenue, context.eventName) ||
      (context.festivalName && fuzzyContains(parsed.eventOrVenue, context.festivalName));
    if (!eventMatch) {
      warnings.push({
        type: "event_mismatch",
        message: `Expected "${context.eventName}" but video mentions "${parsed.eventOrVenue}"`,
        severity: "warning",
      });
      confidence -= 0.2;
    }
  }

  return {
    warnings,
    suggestions,
    confidence: Math.max(0, confidence),
  };
}

/**
 * Case-insensitive containment check with normalization.
 * "Martin Garrix" contains "martin garrix" → true
 * "Ultra Music Festival" contains "Ultra" → true
 */
function fuzzyContains(a: string, b: string): boolean {
  const normA = a.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normB = b.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normA.includes(normB) || normB.includes(normA);
}
