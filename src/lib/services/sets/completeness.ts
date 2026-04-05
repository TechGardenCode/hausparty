import { db } from "@/lib/db";
import { sets } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export interface Factor {
  name: string;
  met: boolean;
  weight: number;
}

export interface CompletenessScore {
  score: number;
  factors: Factor[];
  autoPublish: boolean;
}

const AUTO_PUBLISH_THRESHOLD = 75;

/**
 * Score a set's completeness for publishing readiness.
 *
 * Minimum criteria (60 points):
 *   - Has at least one artist (20)
 *   - Has at least one source (20)
 *   - Has title (10)
 *   - Has date (10)
 *
 * Confidence boosters (up to 40 additional):
 *   - Official source (15)
 *   - Known event link (10)
 *   - Multiple sources (5)
 *   - Has duration (5)
 *   - Has genres (5)
 */
export async function scoreSet(setId: string): Promise<CompletenessScore> {
  const set = await db.query.sets.findFirst({
    where: eq(sets.id, setId),
    with: {
      setArtists: true,
      setGenres: true,
      sources: true,
    },
  });

  if (!set) {
    return { score: 0, factors: [], autoPublish: false };
  }

  const artistCount = set.setArtists?.length ?? 0;
  const sourceList = set.sources ?? [];
  const genreCount = set.setGenres?.length ?? 0;
  const hasOfficialSource = sourceList.some((s) => s.sourceType === "official");

  const factors: Factor[] = [
    // Minimum criteria
    { name: "Has artist", met: artistCount > 0, weight: 20 },
    { name: "Has source", met: sourceList.length > 0, weight: 20 },
    { name: "Has title", met: !!set.title?.trim(), weight: 10 },
    { name: "Has date", met: !!set.performedAt, weight: 10 },
    // Confidence boosters
    { name: "Official source", met: hasOfficialSource, weight: 15 },
    { name: "Linked to event", met: !!set.eventId, weight: 10 },
    { name: "Multiple sources", met: sourceList.length > 1, weight: 5 },
    { name: "Has duration", met: !!set.durationSeconds && set.durationSeconds > 0, weight: 5 },
    { name: "Has genres", met: genreCount > 0, weight: 5 },
  ];

  const score = factors.reduce((sum, f) => sum + (f.met ? f.weight : 0), 0);

  return {
    score,
    factors,
    autoPublish: score >= AUTO_PUBLISH_THRESHOLD,
  };
}

/**
 * Score a set and update its status if it crosses the auto-publish threshold.
 * Returns the new status.
 */
export async function evaluateAndUpdateStatus(
  setId: string
): Promise<"draft" | "published"> {
  const result = await scoreSet(setId);

  const newStatus = result.autoPublish ? "published" : "draft";

  await db
    .update(sets)
    .set({ status: newStatus })
    .where(eq(sets.id, setId));

  return newStatus;
}

/**
 * Re-evaluate status and refresh search view if status changed to published.
 */
export async function evaluateAndRefreshIfPublished(setId: string): Promise<"draft" | "published"> {
  const newStatus = await evaluateAndUpdateStatus(setId);
  if (newStatus === "published") {
    await db.execute(sql`SELECT refresh_search_view()`);
  }
  return newStatus;
}
