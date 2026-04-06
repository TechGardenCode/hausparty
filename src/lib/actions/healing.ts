"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-helpers";
import { scanSets, scanSet, type ReconciliationDelta } from "@/lib/services/healing/scanner";
import { applyDeltas, reconcileSet, forceApplyFix } from "@/lib/services/healing/reconcile";

/**
 * Run a reconciliation scan across sets likely to have issues.
 */
export async function runHealingScan(options?: {
  limit?: number;
  setIds?: string[];
}): Promise<ReconciliationDelta[]> {
  await requireAdmin();
  return scanSets(options);
}

/**
 * Scan a single set for deltas.
 */
export async function scanSingleSet(setId: string): Promise<ReconciliationDelta[]> {
  await requireAdmin();
  return scanSet(setId);
}

/**
 * Apply a specific fix for a delta.
 */
export async function applyHealingFix(
  delta: ReconciliationDelta
): Promise<{ success: boolean }> {
  await requireAdmin();

  // Admin explicitly clicked fix — bypass confidence thresholds
  const success = await forceApplyFix(delta);

  if (success) {
    revalidatePath("/admin/healing");
    revalidatePath("/admin/sets");
    revalidatePath("/admin");
  }

  return { success };
}

/**
 * Auto-fix all eligible deltas from a scan.
 */
export async function autoFixAll(
  deltas: ReconciliationDelta[]
): Promise<{ fixed: number; flagged: number }> {
  await requireAdmin();

  const result = await applyDeltas(deltas);

  revalidatePath("/admin/healing");
  revalidatePath("/admin/sets");
  revalidatePath("/admin");

  return { fixed: result.fixed.length, flagged: result.flagged.length };
}

/**
 * Scan + auto-fix a single set. Used by the user report system (Phase 9).
 */
export async function reconcileAndReport(setId: string): Promise<{
  fixed: number;
  flagged: number;
}> {
  await requireAdmin();

  const result = await reconcileSet(setId);

  if (result.fixed.length > 0) {
    revalidatePath("/admin/healing");
    revalidatePath("/admin/sets");
  }

  return { fixed: result.fixed.length, flagged: result.flagged.length };
}
