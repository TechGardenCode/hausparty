import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { playEvents, sets } from "@/lib/db/schema";
import { recordUserActivity } from "./user-activity";

export interface RecordPlayEventInput {
  userId: string;
  setSlug: string;
  sourceId: string;
  platform: "youtube" | "soundcloud";
  startedAt: Date;
  positionSeconds: number;
  event: "start" | "heartbeat" | "end";
}

/**
 * Upsert a single play session row keyed on (userId, setId, startedAt). The
 * caller fires this from `/api/play` on the `start`, `heartbeat`, and `end`
 * events; durationListenedSeconds is a monotonic max over the wall-clock
 * elapsed reported by the client.
 */
export async function recordPlayEvent(
  input: RecordPlayEventInput
): Promise<{ skipped: boolean }> {
  const [setRow] = await db
    .select({ id: sets.id })
    .from(sets)
    .where(eq(sets.slug, input.setSlug))
    .limit(1);
  if (!setRow) return { skipped: true };

  const position = Math.max(0, Math.floor(input.positionSeconds));

  await db
    .insert(playEvents)
    .values({
      userId: input.userId,
      setId: setRow.id,
      sourceId: input.sourceId,
      platform: input.platform,
      startedAt: input.startedAt,
      lastPositionSeconds: position,
      durationListenedSeconds: position,
    })
    .onConflictDoUpdate({
      target: [playEvents.userId, playEvents.setId, playEvents.startedAt],
      set: {
        lastPositionSeconds: position,
        durationListenedSeconds: sql`greatest(${playEvents.durationListenedSeconds}, ${position})`,
        lastHeartbeatAt: new Date(),
        sourceId: input.sourceId,
        platform: input.platform,
      },
    });

  if (input.event === "start") {
    // Only log play activity on the `start` beat — avoids one row per 30s
    // heartbeat in user_activity.
    await recordUserActivity({
      userId: input.userId,
      action: "play",
      targetType: "set",
      targetId: setRow.id,
    });
  }

  return { skipped: false };
}
