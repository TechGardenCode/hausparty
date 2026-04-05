import { db } from "@/lib/db";
import { scraperRuns } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { upsertEvent } from "./upsert";
import type { Scraper, ScraperStats } from "./types";

/**
 * Orchestrates a scraper run: tracks progress in scraper_runs,
 * processes items sequentially with per-item error handling,
 * and refreshes the search view when done.
 */
export class ScraperRunner {
  async run(
    scraper: Scraper,
    params: Record<string, string>
  ): Promise<{ runId: string; stats: ScraperStats }> {
    // Create scraper_runs row
    const [run] = await db
      .insert(scraperRuns)
      .values({
        scraperName: scraper.name,
        status: "running",
        params,
      })
      .returning({ id: scraperRuns.id });

    const runId = run.id;
    const stats: ScraperStats = {
      fetched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    try {
      const rawItems = await scraper.fetch(params);
      stats.fetched = rawItems.length;

      for (const raw of rawItems) {
        try {
          const normalized = scraper.normalize(raw);
          if (!normalized) {
            stats.skipped++;
            continue;
          }

          const result = await upsertEvent(scraper.name, normalized);
          stats[result.action]++;
        } catch (itemError) {
          stats.errors++;
          console.error(
            `[${scraper.name}] Error processing item:`,
            itemError
          );
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
}
