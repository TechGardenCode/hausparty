"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Scan, Loader2, CheckCircle, AlertTriangle, Wrench, XCircle, Zap,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { runHealingScan, applyHealingFix, autoFixAll } from "@/lib/actions/healing";
import type { ReconciliationDelta } from "@/lib/services/healing/scanner";

type Phase =
  | { step: "idle" }
  | { step: "scanning" }
  | { step: "results"; deltas: ReconciliationDelta[] }
  | { step: "fixing" };

const DELTA_LABELS: Record<string, { label: string; icon: typeof AlertTriangle }> = {
  missing_b2b: { label: "Missing B2B Artist", icon: AlertTriangle },
  missing_genres: { label: "Missing Genres", icon: AlertTriangle },
  missing_date: { label: "Missing Date", icon: AlertTriangle },
  missing_event: { label: "Missing Event Link", icon: AlertTriangle },
  title_mismatch: { label: "Title Mismatch", icon: XCircle },
};

export function HealingPanel() {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const [isPending, startTransition] = useTransition();
  const [fixedCount, setFixedCount] = useState(0);

  function handleScan() {
    startTransition(async () => {
      try {
        setPhase({ step: "scanning" });
        const deltas = await runHealingScan({ limit: 200 });
        setPhase({ step: "results", deltas });
      } catch (err) {
        toast(err instanceof Error ? err.message : "Scan failed", "error");
        setPhase({ step: "idle" });
      }
    });
  }

  function handleAutoFixAll() {
    if (phase.step !== "results") return;
    startTransition(async () => {
      try {
        setPhase({ step: "fixing" });
        const result = await autoFixAll(phase.deltas);
        setFixedCount(result.fixed);
        toast(`Fixed ${result.fixed} issue(s), ${result.flagged} need review`, "success");
        // Re-scan to show remaining issues
        const remaining = await runHealingScan({ limit: 200 });
        setPhase({ step: "results", deltas: remaining });
      } catch (err) {
        toast(err instanceof Error ? err.message : "Auto-fix failed", "error");
        setPhase({ step: "idle" });
      }
    });
  }

  function handleFixOne(delta: ReconciliationDelta) {
    startTransition(async () => {
      try {
        const { success } = await applyHealingFix(delta);
        if (success) {
          toast(`Fixed: ${delta.description}`, "success");
          setFixedCount((c) => c + 1);
          // Remove from list
          if (phase.step === "results") {
            setPhase({
              step: "results",
              deltas: phase.deltas.filter(
                (d) => !(d.setId === delta.setId && d.type === delta.type)
              ),
            });
          }
        } else {
          toast("Fix could not be applied", "error");
        }
      } catch (err) {
        toast(err instanceof Error ? err.message : "Fix failed", "error");
      }
    });
  }

  function handleDismiss(delta: ReconciliationDelta) {
    if (phase.step !== "results") return;
    setPhase({
      step: "results",
      deltas: phase.deltas.filter(
        (d) => !(d.setId === delta.setId && d.type === delta.type)
      ),
    });
  }

  // Group deltas by type for summary
  const deltas = phase.step === "results" ? phase.deltas : [];
  const grouped = deltas.reduce<Record<string, number>>((acc, d) => {
    acc[d.type] = (acc[d.type] ?? 0) + 1;
    return acc;
  }, {});
  const autoFixable = deltas.filter((d) => {
    const threshold = d.setStatus === "published" ? 0.95 : 0.7;
    return d.confidence >= threshold && d.suggestedFix;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Healing</h1>
        {fixedCount > 0 && (
          <span className="text-sm text-accent-positive">{fixedCount} fixed this session</span>
        )}
      </div>

      <p className="text-sm text-text-secondary">
        Scan sets for metadata issues. Auto-fixable issues are applied based on confidence
        thresholds (draft: ≥70%, published: ≥95%). Lower confidence issues are flagged for review.
      </p>

      {/* Scan button */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleScan}
          disabled={isPending}
          className="flex items-center gap-2 rounded bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
        >
          {phase.step === "scanning" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Scan className="h-4 w-4" />
          )}
          {phase.step === "scanning" ? "Scanning..." : "Scan for Issues"}
        </button>

        {phase.step === "results" && autoFixable.length > 0 && (
          <button
            type="button"
            onClick={handleAutoFixAll}
            disabled={isPending}
            className="flex items-center gap-2 rounded bg-accent-positive/20 px-4 py-2 text-sm font-medium text-accent-positive transition-colors hover:bg-accent-positive/30 disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            Auto-fix {autoFixable.length} issue(s)
          </button>
        )}
      </div>

      {/* Summary cards */}
      {phase.step === "results" && (
        <>
          {deltas.length === 0 ? (
            <div className="rounded-lg border border-accent-positive/30 bg-accent-positive/5 p-6 text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-accent-positive" />
              <p className="mt-2 text-sm font-medium text-accent-positive">All clear</p>
              <p className="mt-1 text-xs text-text-tertiary">No metadata issues found</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                {Object.entries(grouped).map(([type, count]) => {
                  const info = DELTA_LABELS[type] ?? { label: type, icon: AlertTriangle };
                  return (
                    <div
                      key={type}
                      className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm"
                    >
                      <info.icon className="h-4 w-4 text-accent-warm" />
                      <span className="text-text-secondary">{info.label}</span>
                      <span className="font-medium text-text-primary">{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Issues list */}
              <div className="flex flex-col gap-2">
                {deltas.map((delta, i) => (
                  <DeltaRow
                    key={`${delta.setId}-${delta.type}-${i}`}
                    delta={delta}
                    onFix={() => handleFixOne(delta)}
                    onDismiss={() => handleDismiss(delta)}
                    isPending={isPending}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function DeltaRow({
  delta,
  onFix,
  onDismiss,
  isPending,
}: {
  delta: ReconciliationDelta;
  onFix: () => void;
  onDismiss: () => void;
  isPending: boolean;
}) {
  const info = DELTA_LABELS[delta.type] ?? { label: delta.type, icon: AlertTriangle };
  const threshold = delta.setStatus === "published" ? 0.95 : 0.7;
  const canAutoFix = delta.confidence >= threshold && delta.suggestedFix;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
            delta.setStatus === "published"
              ? "bg-accent-positive/15 text-accent-positive"
              : "bg-accent-warm/15 text-accent-warm"
          }`}>
            {delta.setStatus}
          </span>
          <Link
            href={`/admin/sets/${delta.setId}/edit`}
            className="truncate text-sm font-medium text-text-primary hover:text-accent-primary"
          >
            {delta.setTitle}
          </Link>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <span className="rounded bg-bg-surface-hover px-1.5 py-0.5">{info.label}</span>
          <span>{delta.description}</span>
          <span className={`${
            delta.confidence >= 0.9 ? "text-accent-positive"
              : delta.confidence >= 0.7 ? "text-accent-warm"
              : "text-accent-negative"
          }`}>
            {Math.round(delta.confidence * 100)}%
          </span>
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        {delta.suggestedFix && (
          <button
            type="button"
            onClick={onFix}
            disabled={isPending}
            className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              canAutoFix
                ? "bg-accent-positive/20 text-accent-positive hover:bg-accent-positive/30"
                : "bg-accent-warm/20 text-accent-warm hover:bg-accent-warm/30"
            }`}
          >
            <Wrench className="h-3 w-3" />
            {canAutoFix ? "Fix" : "Apply Fix"}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="rounded px-2.5 py-1 text-xs text-text-tertiary transition-colors hover:text-text-secondary"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
