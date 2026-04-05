"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-helpers";
import { getScraperByName } from "@/lib/services/scrapers/registry";
import { ScraperRunner } from "@/lib/services/scrapers/runner";
import type { ScraperStats } from "@/lib/services/scrapers/types";

export async function runScraper(
  scraperName: string,
  params: Record<string, string>
): Promise<{ runId: string; stats: ScraperStats }> {
  await requireAdmin();

  const entry = getScraperByName(scraperName);
  if (!entry) {
    throw new Error(`Unknown scraper: ${scraperName}`);
  }

  const scraper = entry.create();
  const runner = new ScraperRunner();
  const result = await runner.run(scraper, params);

  revalidatePath("/admin/scrapers");
  revalidatePath("/admin");

  return result;
}
