"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2, CheckCircle, XCircle } from "lucide-react";
import { runScraper, getScraperRunStatus } from "@/lib/actions/scrapers";

interface RunScraperFormProps {
  scrapers: string[];
}

interface ScraperStats {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

type RunState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "running"; runId: string; stats: ScraperStats }
  | { phase: "completed"; runId: string; stats: ScraperStats }
  | { phase: "failed"; runId: string; stats: ScraperStats; error: string }
  | { phase: "error"; error: string };

const POLL_INTERVAL_MS = 2000;

export function RunScraperForm({ scrapers }: RunScraperFormProps) {
  const router = useRouter();
  const [selectedScraper, setSelectedScraper] = useState(scrapers[0] ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [state, setState] = useState<RunState>({ phase: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => stopPolling, [stopPolling]);

  function startPolling(runId: string) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const status = await getScraperRunStatus(runId);
        if (!status) return;

        if (status.status === "completed") {
          stopPolling();
          setState({
            phase: "completed",
            runId,
            stats: status.stats,
          });
          router.refresh();
        } else if (status.status === "failed") {
          stopPolling();
          setState({
            phase: "failed",
            runId,
            stats: status.stats,
            error: status.errorMessage ?? "Unknown error",
          });
          router.refresh();
        } else {
          setState({
            phase: "running",
            runId,
            stats: status.stats,
          });
        }
      } catch {
        // Polling error — keep trying
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ phase: "starting" });

    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    try {
      const { runId } = await runScraper(selectedScraper, params);
      setState({
        phase: "running",
        runId,
        stats: { fetched: 0, created: 0, updated: 0, skipped: 0, errors: 0 },
      });
      startPolling(runId);
    } catch (err) {
      setState({
        phase: "error",
        error: err instanceof Error ? err.message : "Failed to start scraper",
      });
    }
  }

  const isDisabled = state.phase === "starting" || state.phase === "running";
  const stats = state.phase === "running" || state.phase === "completed" || state.phase === "failed"
    ? state.stats
    : null;
  const processed = stats
    ? stats.created + stats.updated + stats.skipped + stats.errors
    : 0;
  const progressPct = stats && stats.fetched > 0
    ? Math.round((processed / stats.fetched) * 100)
    : 0;

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-5">
      <h2 className="mb-4 text-lg font-semibold">Run Scraper</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-tertiary">Scraper</label>
            <select
              value={selectedScraper}
              onChange={(e) => setSelectedScraper(e.target.value)}
              disabled={isDisabled}
              className="rounded border border-border-subtle bg-bg-primary px-3 py-1.5 text-sm text-text-primary disabled:opacity-50"
            >
              {scrapers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-tertiary">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isDisabled}
              className="rounded border border-border-subtle bg-bg-primary px-3 py-1.5 text-sm text-text-primary disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-tertiary">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isDisabled}
              className="rounded border border-border-subtle bg-bg-primary px-3 py-1.5 text-sm text-text-primary disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={isDisabled || !selectedScraper}
            className="flex items-center gap-2 rounded bg-accent-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
          >
            {isDisabled ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {state.phase === "starting" ? "Starting..." : isDisabled ? "Running..." : "Run"}
          </button>
        </div>

        {/* Progress display */}
        {state.phase === "running" && stats && (
          <div className="rounded border border-accent-primary/30 bg-accent-primary/5 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-accent-primary" />
                <span className="font-medium text-accent-primary">
                  {stats.fetched > 0
                    ? `Processing ${processed} / ${stats.fetched} events`
                    : "Fetching events..."}
                </span>
              </div>
              {stats.fetched > 0 && (
                <span className="text-xs text-text-tertiary">{progressPct}%</span>
              )}
            </div>
            {stats.fetched > 0 && (
              <>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-primary">
                  <div
                    className="h-full rounded-full bg-accent-primary transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="mt-2 flex gap-4 text-xs text-text-tertiary">
                  <span>Created <span className="text-accent-positive">{stats.created}</span></span>
                  <span>Updated <span className="text-accent-primary">{stats.updated}</span></span>
                  <span>Skipped <span className="text-text-secondary">{stats.skipped}</span></span>
                  {stats.errors > 0 && (
                    <span>Errors <span className="text-accent-negative">{stats.errors}</span></span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Completed */}
        {state.phase === "completed" && stats && (
          <div className="rounded border border-accent-positive/30 bg-accent-positive/10 px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-accent-positive" />
              <span className="font-medium text-accent-positive">Run completed</span>
            </div>
            <p className="mt-1 text-text-secondary">
              Fetched {stats.fetched} · Created {stats.created} ·
              Updated {stats.updated} · Skipped {stats.skipped} ·
              Errors {stats.errors}
            </p>
          </div>
        )}

        {/* Failed with partial stats */}
        {state.phase === "failed" && (
          <div className="rounded border border-accent-negative/30 bg-accent-negative/10 px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-accent-negative" />
              <span className="font-medium text-accent-negative">Run failed</span>
            </div>
            <p className="mt-1 text-text-secondary">{state.error}</p>
            {stats && stats.fetched > 0 && (
              <p className="mt-1 text-text-tertiary">
                Processed {processed} / {stats.fetched} before failure ·
                Created {stats.created} · Errors {stats.errors}
              </p>
            )}
          </div>
        )}

        {/* Start error */}
        {state.phase === "error" && (
          <div className="rounded border border-accent-negative/30 bg-accent-negative/10 px-4 py-3 text-sm text-accent-negative">
            {state.error}
          </div>
        )}
      </form>
    </div>
  );
}
