"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { Flag, Loader2, CheckCircle, X } from "lucide-react";
import { submitReport } from "@/lib/actions/reports";
import type { ReportType } from "@/lib/db/types";

interface ReportButtonProps {
  setId?: string;
  artistId?: string;
  isAuthenticated: boolean;
}

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "wrong_artist", label: "Wrong artist" },
  { value: "missing_artist", label: "Missing artist (B2B)" },
  { value: "wrong_event", label: "Wrong event" },
  { value: "wrong_title", label: "Wrong title" },
  { value: "broken_source", label: "Broken/unavailable source" },
  { value: "duplicate", label: "Duplicate set" },
  { value: "other", label: "Other" },
];

export function ReportButton({ setId, artistId, isAuthenticated }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("other");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [autoResolved, setAutoResolved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Click-outside detection
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  function handleSubmit() {
    startTransition(async () => {
      try {
        setError(null);
        const result = await submitReport({
          setId,
          artistId,
          reportType,
          description: description.trim() || undefined,
        });
        setSubmitted(true);
        setAutoResolved(result.autoResolved);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit report");
      }
    });
  }

  if (!isAuthenticated) {
    return (
      <a
        href="/sign-in"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-accent-warm/10 hover:text-accent-warm"
        title="Report an issue"
      >
        <Flag className="h-3.5 w-3.5" />
      </a>
    );
  }

  if (submitted) {
    return (
      <div className="flex h-8 items-center gap-1.5 rounded-lg border border-accent-positive/30 bg-accent-positive/10 px-2.5 text-xs font-medium text-accent-positive">
        <CheckCircle className="h-3.5 w-3.5" />
        {autoResolved ? "Fixed" : "Reported"}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-accent-warm/10 hover:text-accent-warm"
        title="Report an issue"
      >
        <Flag className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border-subtle bg-bg-surface p-3 shadow-[0_4px_16px_rgba(0,0,0,0.4)] [animation:avatar-menu-in_150ms_ease-out] max-sm:fixed max-sm:inset-x-4 max-sm:bottom-20 max-sm:left-4 max-sm:right-4 max-sm:top-auto max-sm:mt-0 max-sm:w-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-secondary">Report an issue</span>
            <button
              type="button"
              onClick={close}
              className="text-text-tertiary hover:text-text-secondary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="rounded border border-border-subtle bg-bg-primary px-2 py-1.5 text-xs text-text-primary"
            >
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..."
              rows={2}
              className="rounded border border-border-subtle bg-bg-primary px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary"
            />

            {error && (
              <p className="text-xs text-accent-negative">{error}</p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="flex items-center justify-center gap-1.5 rounded bg-accent-warm px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-warm/90 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Flag className="h-3 w-3" />
              )}
              {isPending ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
