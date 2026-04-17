import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { userActivity, sets, artists, submissions } from "@/lib/db/schema";
import type { UserAction } from "@/lib/db/types";

export interface ActivityRow {
  id: string;
  action: UserAction;
  createdAt: Date;
  target: {
    type: string;
    id: string;
    label: string;
    href: string | null;
  } | null;
}

/**
 * Pull the most recent activity rows for a user and resolve each target into
 * a human label + href for the admin UI. Targets that have been deleted since
 * the event was logged show as "(deleted)" with no link.
 */
export async function getUserActivity(
  userId: string,
  limit = 200
): Promise<ActivityRow[]> {
  const rows = await db
    .select({
      id: userActivity.id,
      action: userActivity.action,
      createdAt: userActivity.createdAt,
      targetType: userActivity.targetType,
      targetId: userActivity.targetId,
    })
    .from(userActivity)
    .where(eq(userActivity.userId, userId))
    .orderBy(desc(userActivity.createdAt))
    .limit(limit);

  const setIds = rows
    .filter((r) => r.targetType === "set" && r.targetId)
    .map((r) => r.targetId as string);
  const artistIds = rows
    .filter((r) => r.targetType === "artist" && r.targetId)
    .map((r) => r.targetId as string);
  const submissionIds = rows
    .filter((r) => r.targetType === "submission" && r.targetId)
    .map((r) => r.targetId as string);

  const [setRows, artistRows, submissionRows] = await Promise.all([
    setIds.length
      ? db
          .select({ id: sets.id, title: sets.title, slug: sets.slug })
          .from(sets)
          .where(inArray(sets.id, setIds))
      : Promise.resolve([] as { id: string; title: string; slug: string }[]),
    artistIds.length
      ? db
          .select({ id: artists.id, name: artists.name, slug: artists.slug })
          .from(artists)
          .where(inArray(artists.id, artistIds))
      : Promise.resolve([] as { id: string; name: string; slug: string }[]),
    submissionIds.length
      ? db
          .select({ id: submissions.id, title: submissions.title, url: submissions.url })
          .from(submissions)
          .where(inArray(submissions.id, submissionIds))
      : Promise.resolve(
          [] as { id: string; title: string | null; url: string }[]
        ),
  ]);

  const setById = new Map(setRows.map((s) => [s.id, s]));
  const artistById = new Map(artistRows.map((a) => [a.id, a]));
  const submissionById = new Map(submissionRows.map((s) => [s.id, s]));

  return rows.map((r) => {
    let target: ActivityRow["target"] = null;
    if (r.targetType && r.targetId) {
      if (r.targetType === "set") {
        const s = setById.get(r.targetId);
        target = {
          type: "set",
          id: r.targetId,
          label: s?.title ?? "(deleted set)",
          href: s ? `/sets/${s.slug}` : null,
        };
      } else if (r.targetType === "artist") {
        const a = artistById.get(r.targetId);
        target = {
          type: "artist",
          id: r.targetId,
          label: a?.name ?? "(deleted artist)",
          href: a ? `/artists/${a.slug}` : null,
        };
      } else if (r.targetType === "submission") {
        const s = submissionById.get(r.targetId);
        target = {
          type: "submission",
          id: r.targetId,
          label: s?.title ?? s?.url ?? "(deleted submission)",
          href: s ? `/admin/submissions` : null,
        };
      } else {
        target = {
          type: r.targetType,
          id: r.targetId,
          label: r.targetType,
          href: null,
        };
      }
    }
    return {
      id: r.id,
      action: r.action as UserAction,
      createdAt: r.createdAt,
      target,
    };
  });
}
