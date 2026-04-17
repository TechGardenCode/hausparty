import { db } from "@/lib/db";
import { userActivity } from "@/lib/db/schema";
import type { UserAction } from "@/lib/db/types";

/**
 * Fire-and-forget activity row. Internal — callers are already inside a
 * `"use server"` boundary (server actions, route handlers, or RSC pages).
 *
 * Never throws: a dropped activity row must not break the caller's primary
 * operation (saving a set, submitting, etc).
 */
export async function recordUserActivity(params: {
  userId: string;
  action: UserAction;
  targetType?: string | null;
  targetId?: string | null;
}) {
  try {
    await db.insert(userActivity).values({
      userId: params.userId,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
    });
  } catch {
    // swallow — best-effort telemetry
  }
}
