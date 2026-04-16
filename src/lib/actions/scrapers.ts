"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { scraperRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getScraperByName } from "@/lib/services/scrapers/registry";
import { ScraperRunner } from "@/lib/services/scrapers/runner";
import { replayFromArchive } from "@/lib/services/scrapers/raw-archive";
import type { ScraperStats } from "@/lib/services/scrapers/types";

/**
 * Start a scraper run asynchronously. Returns the runId immediately
 * so the UI can poll for progress via getScraperRunStatus().
 */
export async function runScraper(
  scraperName: string,
  params: Record<string, string>
): Promise<{ runId: string }> {
  await requireAdmin();

  const entry = getScraperByName(scraperName);
  if (!entry) {
    throw new Error(`Unknown scraper: ${scraperName}`);
  }

  // Create the run row upfront so we can return the ID immediately
  const [run] = await db
    .insert(scraperRuns)
    .values({
      scraperName,
      status: "running",
      params,
    })
    .returning({ id: scraperRuns.id });

  const scraper = entry.create();
  const runner = new ScraperRunner();

  // Fire and forget — process in the background
  runner.runWithId(run.id, scraper, params).then(() => {
    revalidatePath("/admin/scrapers");
    revalidatePath("/admin");
  }).catch((error) => {
    console.error(`[${scraperName}] Background scraper run failed:`, error);
  });

  return { runId: run.id };
}

/**
 * Get the current status and stats of a scraper run.
 * Used by the UI to poll for progress.
 */
export async function getScraperRunStatus(runId: string): Promise<{
  status: string;
  stats: ScraperStats;
  startedAt: Date;
  completedAt: Date | null;
  errorMessage: string | null;
} | null> {
  await requireAdmin();

  const [run] = await db
    .select({
      status: scraperRuns.status,
      stats: scraperRuns.stats,
      startedAt: scraperRuns.startedAt,
      completedAt: scraperRuns.completedAt,
      errorMessage: scraperRuns.errorMessage,
    })
    .from(scraperRuns)
    .where(eq(scraperRuns.id, runId))
    .limit(1);

  if (!run) return null;

  return {
    status: run.status,
    stats: (run.stats as ScraperStats) ?? {
      fetched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    },
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    errorMessage: run.errorMessage,
  };
}

/**
 * Replay the latest raw payloads for a scraper through normalize + upsert.
 * Idempotent — scraperEntityMap + slug uniqueness prevent duplicates.
 */
export async function replayScraperFromArchive(
  scraperName: string,
  entityType: string = "event"
): Promise<{ runId: string }> {
  await requireAdmin();

  const entry = getScraperByName(scraperName);
  if (!entry) {
    throw new Error(`Unknown scraper: ${scraperName}`);
  }

  const [run] = await db
    .insert(scraperRuns)
    .values({
      scraperName,
      status: "running",
      params: { replaySource: true, entityType },
    })
    .returning({ id: scraperRuns.id });

  replayFromArchive({
    scraperName,
    entityType,
    scraperRunId: run.id,
  })
    .then(() => {
      revalidatePath("/admin/scrapers");
      revalidatePath("/admin");
    })
    .catch(async (error) => {
      console.error(`[${scraperName}] Background replay failed:`, error);
      const message = error instanceof Error ? error.message : "Unknown error";
      await db
        .update(scraperRuns)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorMessage: message,
        })
        .where(eq(scraperRuns.id, run.id));
    });

  return { runId: run.id };
}
