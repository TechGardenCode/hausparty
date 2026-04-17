import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const STUCK_THRESHOLD_MINUTES = 60;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db.execute(sql`
    UPDATE scraper_runs
       SET status = 'failed',
           completed_at = NOW(),
           error_message = 'stuck_timeout'
     WHERE status = 'running'
       AND started_at < NOW() - (${STUCK_THRESHOLD_MINUTES}::int * INTERVAL '1 minute')
    RETURNING id, scraper_name AS "scraperName", started_at AS "startedAt"
  `);

  const swept = result as unknown as Array<{
    id: string;
    scraperName: string;
    startedAt: Date;
  }>;

  return Response.json({
    swept: swept.map((r) => ({
      id: r.id,
      scraperName: r.scraperName,
      startedAt: r.startedAt instanceof Date ? r.startedAt.toISOString() : r.startedAt,
    })),
    thresholdMinutes: STUCK_THRESHOLD_MINUTES,
  });
}
