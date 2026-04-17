import { desc, eq, sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { playEvents, sets } from "@/lib/db/schema";
import { normalizeSet } from "./sets";

const setWithRelations = {
  setArtists: { with: { artist: true } },
  setGenres: { with: { genre: true } },
  event: { with: { festival: true } },
  sources: true,
} as const;

/**
 * Reverse-chronological list of sets the user has played. Collapsed to one
 * row per set — we always show the latest play session per set, not every
 * session, so the list stays readable.
 */
export async function getRecentPlays(userId: string, limit = 50) {
  const latestPerSet = db
    .select({
      setId: playEvents.setId,
      lastHeartbeatAt: sql<Date>`max(${playEvents.lastHeartbeatAt})`.as(
        "last_heartbeat_at"
      ),
      durationListened: sql<number>`sum(${playEvents.durationListenedSeconds})`.as(
        "duration_listened"
      ),
    })
    .from(playEvents)
    .where(eq(playEvents.userId, userId))
    .groupBy(playEvents.setId)
    .orderBy(desc(sql`max(${playEvents.lastHeartbeatAt})`))
    .limit(limit)
    .as("latest_per_set");

  const rows = await db
    .select({
      setId: latestPerSet.setId,
      lastHeartbeatAt: latestPerSet.lastHeartbeatAt,
      durationListened: latestPerSet.durationListened,
    })
    .from(latestPerSet);

  if (rows.length === 0) return [];

  const setIds = rows.map((r) => r.setId);
  const setRows = await db.query.sets.findMany({
    where: inArray(sets.id, setIds),
    with: setWithRelations,
  });

  const byId = new Map(setRows.map((s) => [s.id, s]));
  return rows
    .map((r) => {
      const raw = byId.get(r.setId);
      if (!raw) return null;
      return {
        ...normalizeSet(raw),
        lastHeartbeatAt: r.lastHeartbeatAt,
        durationListened: Number(r.durationListened ?? 0),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

/**
 * "Continue listening" rail — the most recent play per set where the user
 * did not appear to finish (duration_listened < duration of set, falling
 * back to >60s listened when set duration is unknown).
 */
export async function getContinueListening(userId: string, limit = 6) {
  const recent = await getRecentPlays(userId, limit * 2);
  return recent
    .filter((r) => {
      const total = r.duration_seconds;
      if (typeof total === "number" && total > 0) {
        return r.durationListened < total - 30;
      }
      return r.durationListened > 60;
    })
    .slice(0, limit);
}
