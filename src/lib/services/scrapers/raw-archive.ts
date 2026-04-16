import { db } from "@/lib/db";
import { scraperRawPayloads, scraperRuns } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getScraperByName } from "./registry";
import { upsertEvent } from "./upsert";
import type { Scraper } from "./types";

export interface ArchiveRawPayloadInput {
  scraperName: string;
  entityType: string;
  externalId: string;
  raw: unknown;
  scraperRunId?: string | null;
}

export async function archiveRawPayload(input: ArchiveRawPayloadInput): Promise<void> {
  await db.insert(scraperRawPayloads).values({
    scraperName: input.scraperName,
    entityType: input.entityType,
    externalId: input.externalId,
    rawJson: input.raw as object,
    scraperRunId: input.scraperRunId ?? null,
  });
}

export interface ReplayStats {
  archiveRowsScanned: number;
  normalized: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

export interface ReplayOptions {
  scraperName: string;
  entityType?: string;
  since?: Date;
  scraperRunId?: string;
}

interface ArchiveRow {
  raw_json: unknown;
}

export async function replayFromArchive(opts: ReplayOptions): Promise<ReplayStats> {
  const entityType = opts.entityType ?? "event";
  const stats: ReplayStats = {
    archiveRowsScanned: 0,
    normalized: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  const entry = getScraperByName(opts.scraperName);
  if (!entry) throw new Error(`Unknown scraper: ${opts.scraperName}`);
  const scraper: Scraper = entry.create();

  const sinceFilter = opts.since
    ? sql`AND fetched_at >= ${opts.since.toISOString()}`
    : sql``;

  const rows = (await db.execute(sql`
    SELECT DISTINCT ON (scraper_name, entity_type, external_id)
      raw_json
    FROM scraper_raw_payloads
    WHERE scraper_name = ${opts.scraperName}
      AND entity_type = ${entityType}
      ${sinceFilter}
    ORDER BY scraper_name, entity_type, external_id, fetched_at DESC
  `)) as unknown as ArchiveRow[];

  stats.archiveRowsScanned = rows.length;

  if (entityType !== "event") {
    if (opts.scraperRunId) {
      await finalizeReplayRun(opts.scraperRunId, stats);
    }
    return stats;
  }

  for (const row of rows) {
    try {
      const normalized = scraper.normalize(row.raw_json as never);
      if (!normalized) {
        stats.skipped++;
        continue;
      }
      stats.normalized++;
      const result = await upsertEvent(opts.scraperName, normalized);
      if (result.action === "created") stats.created++;
      else if (result.action === "updated") stats.updated++;
      else stats.skipped++;
    } catch (err) {
      stats.errors++;
      console.error(`[replay][${opts.scraperName}] Error normalizing row:`, err);
    }
  }

  if (stats.created > 0) {
    await db.execute(sql`SELECT refresh_search_view()`);
  }

  if (opts.scraperRunId) {
    await finalizeReplayRun(opts.scraperRunId, stats);
  }

  return stats;
}

async function finalizeReplayRun(runId: string, stats: ReplayStats): Promise<void> {
  const hasResult = stats.created > 0 || stats.updated > 0 || stats.skipped > 0;
  const status = stats.errors > 0 && !hasResult ? "failed" : "completed";
  await db
    .update(scraperRuns)
    .set({
      status,
      completedAt: new Date(),
      stats: {
        fetched: stats.archiveRowsScanned,
        created: stats.created,
        updated: stats.updated,
        skipped: stats.skipped,
        errors: stats.errors,
      },
    })
    .where(eq(scraperRuns.id, runId));
}
