import { db } from "@/lib/db";
import { scraperRuns } from "@/lib/db/schema";
import { getScraperByName } from "@/lib/services/scrapers/registry";
import { ScraperRunner } from "@/lib/services/scrapers/runner";
import { getInFlightRun } from "@/lib/services/scrapers/in-flight";

interface Body {
  scraperName?: unknown;
  params?: unknown;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const scraperName =
    typeof body.scraperName === "string" ? body.scraperName : null;
  if (!scraperName) {
    return Response.json(
      { error: "scraperName is required" },
      { status: 400 }
    );
  }

  const entry = getScraperByName(scraperName);
  if (!entry) {
    return Response.json(
      { error: `Unknown scraper: ${scraperName}` },
      { status: 400 }
    );
  }

  const params =
    body.params && typeof body.params === "object" && !Array.isArray(body.params)
      ? (body.params as Record<string, string>)
      : {};

  const inFlight = await getInFlightRun(scraperName);
  if (inFlight) {
    return Response.json(
      {
        error: "in_flight",
        runId: inFlight.id,
        startedAt: inFlight.startedAt.toISOString(),
      },
      { status: 409 }
    );
  }

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

  runner.runWithId(run.id, scraper, params).catch((error) => {
    console.error(`[${scraperName}] Scheduled scraper run failed:`, error);
  });

  return Response.json({ runId: run.id }, { status: 202 });
}
