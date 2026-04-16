import { db } from "@/lib/db";
import { scraperRuns } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { upsertEvent } from "./upsert";
import { archiveRawPayload } from "./raw-archive";
import type { Scraper, ScraperStats } from "./types";

const STATS_FLUSH_INTERVAL = 25;

/**
 * Orchestrates a scraper run: tracks progress in scraper_runs,
 * processes items sequentially with per-item error handling,
 * flushes stats incrementally, and refreshes the search view when done.
 */
export class ScraperRunner {
  /**
   * Run a scraper using a pre-created scraper_runs row.
   * The caller is responsible for creating the row and passing the runId.
   * This allows fire-and-forget execution from server actions.
   */
  async runWithId(
    runId: string,
    scraper: Scraper,
    params: Record<string, string>
  ): Promise<{ runId: string; stats: ScraperStats }> {
    const stats: ScraperStats = {
      fetched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    let processed = 0;

    try {
      const rawItems = await scraper.fetch(params);
      stats.fetched = rawItems.length;

      // Flush fetched count immediately so UI knows the total
      await this.flushStats(runId, stats);

      for (const raw of rawItems) {
        try {
          for (const p of scraper.extractRawPayloads(raw)) {
            try {
              await archiveRawPayload({
                scraperName: scraper.name,
                entityType: p.entityType,
                externalId: p.externalId,
                raw: p.payload,
                scraperRunId: runId,
              });
            } catch (archiveErr) {
              // Archive failure must not abort the normalize + upsert path
              console.error(
                `[${scraper.name}] Failed to archive ${p.entityType} ${p.externalId}:`,
                archiveErr
              );
            }
          }

          const normalized = scraper.normalize(raw);
          if (!normalized) {
            stats.skipped++;
            processed++;
            continue;
          }

          const result = await upsertEvent(scraper.name, normalized);
          stats[result.action]++;
          processed++;
        } catch (itemError) {
          stats.errors++;
          processed++;
          console.error(
            `[${scraper.name}] Error processing item:`,
            itemError
          );
        }

        // Flush stats periodically
        if (processed % STATS_FLUSH_INTERVAL === 0) {
          await this.flushStats(runId, stats);
        }
      }

      await db
        .update(scraperRuns)
        .set({
          status: "completed",
          completedAt: new Date(),
          stats,
        })
        .where(eq(scraperRuns.id, runId));

      if (stats.created > 0) {
        await db.execute(sql`SELECT refresh_search_view()`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      await db
        .update(scraperRuns)
        .set({
          status: "failed",
          completedAt: new Date(),
          stats,
          errorMessage: message,
        })
        .where(eq(scraperRuns.id, runId));

      throw error;
    }

    return { runId, stats };
  }

  /**
   * Run a scraper, creating its own scraper_runs row.
   * Used for direct invocation (tests, CLI). For server actions, use runWithId.
   */
  async run(
    scraper: Scraper,
    params: Record<string, string>
  ): Promise<{ runId: string; stats: ScraperStats }> {
    const [run] = await db
      .insert(scraperRuns)
      .values({
        scraperName: scraper.name,
        status: "running",
        params,
      })
      .returning({ id: scraperRuns.id });

    return this.runWithId(run.id, scraper, params);
  }

  private async flushStats(runId: string, stats: ScraperStats): Promise<void> {
    try {
      await db
        .update(scraperRuns)
        .set({ stats })
        .where(eq(scraperRuns.id, runId));
    } catch {
      // Non-fatal — stats flush failure shouldn't abort the run
    }
  }
}
