import { Download, CheckCircle, XCircle, Loader2, Clock } from "lucide-react";
import { getScraperRuns, getScraperOverview } from "@/lib/queries/admin";
import { scraperRegistry } from "@/lib/services/scrapers/registry";
import { RunScraperForm } from "./run-scraper-form";
import type { Metadata } from "next";
import type { ScraperRun } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Scrapers | Admin | hausparty",
};

function StatusBadge({ status }: { status: ScraperRun["status"] }) {
  const config = {
    running: {
      icon: Loader2,
      label: "Running",
      className: "text-accent-primary bg-accent-primary/15",
      spin: true,
    },
    completed: {
      icon: CheckCircle,
      label: "Completed",
      className: "text-accent-positive bg-accent-positive/15",
      spin: false,
    },
    failed: {
      icon: XCircle,
      label: "Failed",
      className: "text-accent-negative bg-accent-negative/15",
      spin: false,
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      <Icon className={`h-3 w-3 ${config.spin ? "animate-spin" : ""}`} />
      {config.label}
    </span>
  );
}

function formatDuration(start: string | Date, end: string | Date | null): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ScrapersPage() {
  const [overview, runs] = await Promise.all([
    getScraperOverview(),
    getScraperRuns(undefined, 25),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Scrapers</h1>

      {/* Scraper Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {scraperRegistry.map((entry) => {
          const data = overview[entry.name];
          return (
            <div
              key={entry.name}
              className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-surface p-5"
            >
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-accent-primary" />
                <span className="font-semibold">{entry.name}</span>
                {data?.lastRun && (
                  <StatusBadge status={data.lastRun.status} />
                )}
              </div>
              <p className="text-sm text-text-secondary">
                {entry.description}
              </p>
              {data && (
                <div className="flex gap-4 text-xs text-text-tertiary">
                  <span>{data.entityCounts.events} events</span>
                  <span>{data.entityCounts.artists} artists</span>
                  <span>{data.entityCounts.festivals} festivals</span>
                </div>
              )}
              {data?.lastRun && (
                <p className="text-xs text-text-tertiary">
                  Last run: {formatDate(data.lastRun.startedAt)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Run Scraper Form */}
      <RunScraperForm scrapers={scraperRegistry.map((s) => s.name)} />

      {/* Run History */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Run History</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-text-tertiary">No scraper runs yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-surface text-left text-xs text-text-tertiary">
                  <th className="px-4 py-2.5 font-medium">Scraper</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Started</th>
                  <th className="px-4 py-2.5 font-medium">Duration</th>
                  <th className="px-4 py-2.5 font-medium">Fetched</th>
                  <th className="px-4 py-2.5 font-medium">Created</th>
                  <th className="px-4 py-2.5 font-medium">Updated</th>
                  <th className="px-4 py-2.5 font-medium">Skipped</th>
                  <th className="px-4 py-2.5 font-medium">Errors</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const stats = (run.stats ?? {}) as Record<string, number>;
                  return (
                    <tr
                      key={run.id}
                      className="border-b border-border-subtle last:border-0"
                    >
                      <td className="px-4 py-2.5 font-medium">
                        {run.scraperName}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary">
                        {formatDate(run.startedAt)}
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(run.startedAt, run.completedAt)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary">
                        {stats.fetched ?? 0}
                      </td>
                      <td className="px-4 py-2.5 text-accent-positive">
                        {stats.created ?? 0}
                      </td>
                      <td className="px-4 py-2.5 text-accent-primary">
                        {stats.updated ?? 0}
                      </td>
                      <td className="px-4 py-2.5 text-text-tertiary">
                        {stats.skipped ?? 0}
                      </td>
                      <td
                        className={`px-4 py-2.5 ${(stats.errors ?? 0) > 0 ? "text-accent-negative" : "text-text-tertiary"}`}
                      >
                        {stats.errors ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
