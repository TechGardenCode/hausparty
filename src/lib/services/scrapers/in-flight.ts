import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scraperRuns } from "@/lib/db/schema";

export interface InFlightRun {
  id: string;
  startedAt: Date;
}

export async function getInFlightRun(
  scraperName: string
): Promise<InFlightRun | null> {
  const [row] = await db
    .select({ id: scraperRuns.id, startedAt: scraperRuns.startedAt })
    .from(scraperRuns)
    .where(
      and(
        eq(scraperRuns.scraperName, scraperName),
        eq(scraperRuns.status, "running")
      )
    )
    .limit(1);

  return row ?? null;
}

export class ScraperInFlightError extends Error {
  constructor(
    public readonly scraperName: string,
    public readonly runId: string,
    public readonly startedAt: Date
  ) {
    super(`Scraper ${scraperName} is already running (run ${runId})`);
    this.name = "ScraperInFlightError";
  }
}
