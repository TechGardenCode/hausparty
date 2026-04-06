/**
 * Auto-reconciler.
 *
 * Applies fixes from reconciliation deltas based on confidence thresholds
 * that vary by set status:
 * - Draft sets: auto-fix at confidence >= 0.7
 * - Published sets: auto-fix at confidence >= 0.95 (conservative)
 */

import { db } from "@/lib/db";
import { sets, setArtists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { findOrCreateArtist } from "@/lib/services/artist-matching";
import { normalizeArtistName } from "@/lib/services/normalization/artist-names";
import { inferGenresForSet } from "@/lib/services/normalization/genre-inference";
import { evaluateAndRefreshIfPublished } from "@/lib/services/sets/completeness";
import { scanSet, type ReconciliationDelta } from "./scanner";

const DRAFT_THRESHOLD = 0.7;
const PUBLISHED_THRESHOLD = 0.95;

export interface ReconcileResult {
  fixed: ReconciliationDelta[];
  flagged: ReconciliationDelta[];
}

/**
 * Scan and reconcile a single set.
 * Auto-fixes what's safe, flags the rest.
 */
export async function reconcileSet(setId: string): Promise<ReconcileResult> {
  const deltas = await scanSet(setId);
  return applyDeltas(deltas);
}

/**
 * Apply a list of deltas, splitting into auto-fixed and flagged.
 */
export async function applyDeltas(deltas: ReconciliationDelta[]): Promise<ReconcileResult> {
  const fixed: ReconciliationDelta[] = [];
  const flagged: ReconciliationDelta[] = [];

  for (const delta of deltas) {
    const threshold = delta.setStatus === "published" ? PUBLISHED_THRESHOLD : DRAFT_THRESHOLD;

    if (delta.confidence >= threshold && delta.suggestedFix) {
      const success = await applyFix(delta);
      if (success) {
        fixed.push(delta);
        continue;
      }
    }

    flagged.push(delta);
  }

  // Re-run completeness scoring for any sets that were fixed
  const fixedSetIds = [...new Set(fixed.map((d) => d.setId))];
  for (const setId of fixedSetIds) {
    await evaluateAndRefreshIfPublished(setId);
  }

  return { fixed, flagged };
}

/**
 * Force-apply a single delta's fix, bypassing confidence thresholds.
 * Used when an admin explicitly clicks "Apply Fix" in the healing UI.
 */
export async function forceApplyFix(delta: ReconciliationDelta): Promise<boolean> {
  if (!delta.suggestedFix) return false;
  const success = await applyFix(delta);
  if (success) {
    await evaluateAndRefreshIfPublished(delta.setId);
  }
  return success;
}

/**
 * Apply a single fix. Returns true on success.
 */
async function applyFix(delta: ReconciliationDelta): Promise<boolean> {
  const fix = delta.suggestedFix;
  if (!fix) return false;

  try {
    switch (fix.action) {
      case "link_artists": {
        const artistNames = fix.data.artistNames as string[];
        const existingCount = await getArtistCount(delta.setId);

        for (let i = 0; i < artistNames.length; i++) {
          const { artistId } = await findOrCreateArtist(normalizeArtistName(artistNames[i]));
          await db
            .insert(setArtists)
            .values({ setId: delta.setId, artistId, position: existingCount + i })
            .onConflictDoNothing();
        }
        return true;
      }

      case "infer_genres": {
        const artistIds = fix.data.artistIds as string[];
        const count = await inferGenresForSet(delta.setId, artistIds);
        return count > 0;
      }

      case "copy_event_date": {
        const date = fix.data.date as string;
        await db
          .update(sets)
          .set({ performedAt: new Date(date) })
          .where(eq(sets.id, delta.setId));
        return true;
      }

      case "link_event": {
        const eventId = fix.data.eventId as string;
        await db
          .update(sets)
          .set({ eventId })
          .where(eq(sets.id, delta.setId));
        return true;
      }

      default:
        return false;
    }
  } catch (error) {
    console.error(`[healing] Failed to apply fix for set ${delta.setId}:`, error);
    return false;
  }
}

async function getArtistCount(setId: string): Promise<number> {
  const rows = await db
    .select({ artistId: setArtists.artistId })
    .from(setArtists)
    .where(eq(setArtists.setId, setId));
  return rows.length;
}
