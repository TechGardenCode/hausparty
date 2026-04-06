"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { eq, and, sql, count, desc } from "drizzle-orm";
import { reconcileSet } from "@/lib/services/healing/reconcile";
import type { ReportType } from "@/lib/db/types";

/**
 * Submit a user report. Triggers reconciliation on the affected set.
 * If the reconciler can auto-fix the issue, the report is auto-resolved.
 */
export async function submitReport(data: {
  setId?: string;
  artistId?: string;
  reportType: ReportType;
  description?: string;
}): Promise<{ id: string; autoResolved: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be signed in to report an issue");
  }

  // Rate limit: max 10 reports per user per day
  const [recent] = await db
    .select({ count: count() })
    .from(reports)
    .where(
      and(
        eq(reports.userId, session.user.id),
        sql`${reports.createdAt} > NOW() - INTERVAL '24 hours'`
      )
    );

  if ((recent?.count ?? 0) >= 10) {
    throw new Error("Report limit reached. You can submit up to 10 reports per day.");
  }

  // Create the report
  const [report] = await db
    .insert(reports)
    .values({
      userId: session.user.id,
      setId: data.setId ?? null,
      artistId: data.artistId ?? null,
      reportType: data.reportType,
      description: data.description ?? null,
    })
    .returning({ id: reports.id });

  // Trigger reconciliation if a set was reported
  let autoResolved = false;
  if (data.setId) {
    const result = await reconcileSet(data.setId);
    if (result.fixed.length > 0) {
      // Auto-resolve the report since the issue was fixed
      await db
        .update(reports)
        .set({ status: "resolved", resolvedAt: new Date() })
        .where(eq(reports.id, report.id));
      autoResolved = true;
    }
  }

  revalidatePath("/admin/reports");
  revalidatePath("/admin");

  return { id: report.id, autoResolved };
}

/**
 * Get open reports for the admin queue.
 */
export async function getReports(statusFilter?: "open" | "resolved" | "dismissed") {
  await requireAdmin();

  const whereClause = statusFilter ? eq(reports.status, statusFilter) : undefined;

  const data = await db.query.reports.findMany({
    where: whereClause,
    with: {
      set: true,
      artist: true,
    },
    orderBy: [desc(reports.createdAt)],
    limit: 100,
  });

  return data.map((r) => ({
    id: r.id,
    userId: r.userId,
    reportType: r.reportType,
    description: r.description,
    status: r.status,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
    set: r.set ? { id: r.set.id, title: r.set.title, slug: r.set.slug } : null,
    artist: r.artist ? { id: r.artist.id, name: r.artist.name, slug: r.artist.slug } : null,
  }));
}

/**
 * Get count of open reports for dashboard.
 */
export async function getOpenReportCount(): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(reports)
    .where(eq(reports.status, "open"));
  return result?.count ?? 0;
}

/**
 * Resolve a report.
 */
export async function resolveReport(reportId: string): Promise<void> {
  await requireAdmin();
  await db
    .update(reports)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(eq(reports.id, reportId));
  revalidatePath("/admin/reports");
}

/**
 * Dismiss a report.
 */
export async function dismissReport(reportId: string): Promise<void> {
  await requireAdmin();
  await db
    .update(reports)
    .set({ status: "dismissed", resolvedAt: new Date() })
    .where(eq(reports.id, reportId));
  revalidatePath("/admin/reports");
}
