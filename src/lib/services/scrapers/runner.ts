import { createAdminClient } from "@/lib/supabase/admin";
import { upsertEvent } from "./upsert";
import type { Scraper, ScraperStats } from "./types";
import type { Json } from "@/lib/types/supabase";

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
    const supabase = createAdminClient();

    // Create scraper_runs row
    const { data: run, error: runError } = await supabase
      .from("scraper_runs")
      .insert({
        scraper_name: scraper.name,
        status: "running" as const,
        params,
      })
      .select("id")
      .single();

    if (runError || !run) {
      throw new Error(`Failed to create scraper run: ${runError?.message}`);
    }

    const runId = run.id;
    const stats: ScraperStats = {
      fetched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    try {
      // Fetch raw data
      const rawItems = await scraper.fetch(params);
      stats.fetched = rawItems.length;

      // Process items sequentially
      for (const raw of rawItems) {
        try {
          const normalized = scraper.normalize(raw);
          if (!normalized) {
            stats.skipped++;
            continue;
          }

          const result = await upsertEvent(supabase, scraper.name, normalized);
          stats[result.action]++;
        } catch (itemError) {
          stats.errors++;
          console.error(
            `[${scraper.name}] Error processing item:`,
            itemError
          );
        }
      }

      // Update run as completed
      await supabase
        .from("scraper_runs")
        .update({
          status: "completed" as const,
          completed_at: new Date().toISOString(),
          stats: stats as unknown as Json,
        })
        .eq("id", runId);

      // Refresh search view if any entities were created
      if (stats.created > 0) {
        await supabase.rpc("refresh_search_view");
      }
    } catch (error) {
      // Update run as failed
      const message =
        error instanceof Error ? error.message : "Unknown error";
      await supabase
        .from("scraper_runs")
        .update({
          status: "failed" as const,
          completed_at: new Date().toISOString(),
          stats: stats as unknown as Json,
          error_message: message,
        })
        .eq("id", runId);

      throw error;
    }

    return { runId, stats };
  }
}
