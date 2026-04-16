"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { History, Loader2 } from "lucide-react";
import { replayScraperFromArchive, getScraperRunStatus } from "@/lib/actions/scrapers";

interface ReplayButtonProps {
  scraperName: string;
}

export function ReplayButton({ scraperName }: ReplayButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      const { runId } = await replayScraperFromArchive(scraperName);
      const pollStart = Date.now();
      const timer = setInterval(async () => {
        const status = await getScraperRunStatus(runId);
        const terminal = status?.status === "completed" || status?.status === "failed";
        const timedOut = Date.now() - pollStart > 120_000;
        if (terminal || timedOut) {
          clearInterval(timer);
          setBusy(false);
          router.refresh();
        }
      }, 1500);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Replay failed to start");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex items-center gap-1.5 self-start rounded border border-border-subtle bg-bg-primary px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-accent-primary/50 hover:text-accent-primary disabled:opacity-50"
        title="Re-run normalize + upsert against the latest archived payloads. Idempotent."
      >
        {busy ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <History className="h-3 w-3" />
        )}
        {busy ? "Replaying..." : "Replay from archive"}
      </button>
      {error && <span className="text-xs text-accent-negative">{error}</span>}
    </div>
  );
}
