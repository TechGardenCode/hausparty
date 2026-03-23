"use client";

import { useState, useTransition } from "react";
import { Play, Loader2 } from "lucide-react";
import { runScraper } from "@/lib/actions/scrapers";

interface RunScraperFormProps {
  scrapers: string[];
}

export function RunScraperForm({ scrapers }: RunScraperFormProps) {
  const [selectedScraper, setSelectedScraper] = useState(scrapers[0] ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    runId: string;
    stats: { fetched: number; created: number; updated: number; skipped: number; errors: number };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setError(null);

    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    startTransition(async () => {
      try {
        const res = await runScraper(selectedScraper, params);
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Scraper run failed");
      }
    });
  }

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
              className="rounded border border-border-subtle bg-bg-primary px-3 py-1.5 text-sm text-text-primary"
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
              className="rounded border border-border-subtle bg-bg-primary px-3 py-1.5 text-sm text-text-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-tertiary">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded border border-border-subtle bg-bg-primary px-3 py-1.5 text-sm text-text-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || !selectedScraper}
            className="flex items-center gap-2 rounded bg-accent-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isPending ? "Running..." : "Run"}
          </button>
        </div>

        {result && (
          <div className="rounded border border-accent-positive/30 bg-accent-positive/10 px-4 py-3 text-sm">
            <p className="font-medium text-accent-positive">Run completed</p>
            <p className="mt-1 text-text-secondary">
              Fetched {result.stats.fetched} · Created {result.stats.created} ·
              Updated {result.stats.updated} · Skipped {result.stats.skipped} ·
              Errors {result.stats.errors}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded border border-accent-negative/30 bg-accent-negative/10 px-4 py-3 text-sm text-accent-negative">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
