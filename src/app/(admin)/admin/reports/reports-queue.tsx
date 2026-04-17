"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Flag, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { getReports, resolveReport, dismissReport } from "@/lib/actions/reports";

type StatusFilter = "open" | "resolved" | "dismissed" | undefined;

interface ReportRow {
  id: string;
  userId: string;
  reportType: string;
  description: string | null;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  set: { id: string; title: string; slug: string } | null;
  artist: { id: string; name: string; slug: string } | null;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  wrong_artist: "Wrong Artist",
  missing_artist: "Missing Artist",
  wrong_event: "Wrong Event",
  wrong_title: "Wrong Title",
  broken_source: "Broken Source",
  duplicate: "Duplicate",
  other: "Other",
};

export function ReportsQueue() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    startTransition(async () => {
      const data = await getReports(filter);
      setReports(data);
      setLoaded(true);
    });
  }, [filter]);

  function handleResolve(id: string) {
    startTransition(async () => {
      try {
        await resolveReport(id);
        setReports((prev) => prev.filter((r) => r.id !== id));
        toast("Report resolved", "success");
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed", "error");
      }
    });
  }

  function handleDismiss(id: string) {
    startTransition(async () => {
      try {
        await dismissReport(id);
        setReports((prev) => prev.filter((r) => r.id !== id));
        toast("Report dismissed", "success");
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed", "error");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <span className="text-sm text-text-tertiary">{reports.length} reports</span>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2">
        {([
          { label: "Open", value: "open" as const },
          { label: "Resolved", value: "resolved" as const },
          { label: "Dismissed", value: "dismissed" as const },
          { label: "All", value: undefined },
        ]).map((tab) => (
          <button
            key={tab.label}
            onClick={() => setFilter(tab.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.value
                ? "bg-accent-primary/20 text-accent-primary"
                : "text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!loaded ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-bg-surface p-8 text-center text-text-tertiary">
          <Flag className="mx-auto h-8 w-8 mb-2" />
          No {filter ?? ""} reports
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                    report.status === "open"
                      ? "bg-accent-warm/15 text-accent-warm"
                      : report.status === "resolved"
                        ? "bg-accent-positive/15 text-accent-positive"
                        : "bg-bg-surface-hover text-text-tertiary"
                  }`}>
                    {report.status}
                  </span>
                  <span className="rounded bg-bg-surface-hover px-1.5 py-0.5 text-xs text-text-secondary">
                    {REPORT_TYPE_LABELS[report.reportType] ?? report.reportType}
                  </span>
                  {report.set && (
                    <Link
                      href={`/sets/${report.set.slug}`}
                      className="truncate text-sm text-text-primary hover:text-accent-primary"
                    >
                      {report.set.title}
                    </Link>
                  )}
                  {report.artist && !report.set && (
                    <Link
                      href={`/artists/${report.artist.slug}`}
                      className="truncate text-sm text-text-primary hover:text-accent-primary"
                    >
                      {report.artist.name}
                    </Link>
                  )}
                </div>
                {report.description && (
                  <p className="text-xs text-text-tertiary">{report.description}</p>
                )}
                <span className="text-xs text-text-tertiary">
                  {new Date(report.createdAt).toLocaleDateString()}
                </span>
              </div>

              {report.status === "open" && (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleResolve(report.id)}
                    disabled={isPending}
                    className="flex items-center gap-1 rounded bg-accent-positive/20 px-2.5 py-1 text-xs font-medium text-accent-positive hover:bg-accent-positive/30 disabled:opacity-50"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Resolve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismiss(report.id)}
                    disabled={isPending}
                    className="rounded px-2.5 py-1 text-xs text-text-tertiary hover:text-text-secondary disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
