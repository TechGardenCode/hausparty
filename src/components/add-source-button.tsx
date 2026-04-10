"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { Link as LinkIcon, Loader2, CheckCircle, X } from "lucide-react";
import { submitSourceSuggestion } from "@/lib/actions/source-suggestions";
import type { SourceType, MediaType } from "@/lib/db/types";

interface AddSourceButtonProps {
  setId: string;
  isAuthenticated: boolean;
}

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: "official", label: "Official release" },
  { value: "artist", label: "Artist upload" },
  { value: "fan", label: "Fan recording" },
];

export function AddSourceButton({ setId, isAuthenticated }: AddSourceButtonProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("fan");
  const [mediaType, setMediaType] = useState<MediaType>("video");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  function handleUrlChange(value: string) {
    setUrl(value);
    if (value.includes("soundcloud.com")) {
      setMediaType("audio");
    } else if (value.includes("youtube.com") || value.includes("youtu.be")) {
      setMediaType("video");
    }
  }

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
        const result = await submitSourceSuggestion({
          setId,
          url: url.trim(),
          sourceType,
          mediaType,
          note: note.trim() || undefined,
        });
        if ("error" in result) {
          setError(result.error);
          return;
        }
        setSubmitted(true);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit source");
      }
    });
  }

  if (!isAuthenticated) {
    return (
      <a
        href="/sign-in"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-accent-primary/10 hover:text-accent-primary"
        title="Add a source"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </a>
    );
  }

  if (submitted) {
    return (
      <div className="flex h-8 items-center gap-1.5 rounded-lg border border-accent-positive/30 bg-accent-positive/10 px-2.5 text-xs font-medium text-accent-positive">
        <CheckCircle className="h-3.5 w-3.5" />
        Submitted
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-accent-primary/10 hover:text-accent-primary"
        title="Add a source"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-border-subtle bg-bg-surface p-3 shadow-[0_4px_16px_rgba(0,0,0,0.4)] [animation:avatar-menu-in_150ms_ease-out] max-sm:fixed max-sm:inset-x-4 max-sm:bottom-20 max-sm:left-4 max-sm:right-4 max-sm:top-auto max-sm:mt-0 max-sm:w-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-secondary">Add a source</span>
            <button
              type="button"
              onClick={close}
              className="text-text-tertiary hover:text-text-secondary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="YouTube or SoundCloud URL"
              className="rounded border border-border-subtle bg-bg-primary px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary"
            />

            <div className="flex gap-2">
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceType)}
                className="flex-1 rounded border border-border-subtle bg-bg-primary px-2 py-1.5 text-xs text-text-primary"
              >
                {SOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as MediaType)}
                className="rounded border border-border-subtle bg-bg-primary px-2 py-1.5 text-xs text-text-primary"
              >
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note (e.g. 'Artist reupload in HD')"
              rows={2}
              className="rounded border border-border-subtle bg-bg-primary px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary"
            />

            {error && (
              <p className="text-xs text-accent-negative">{error}</p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !url.trim()}
              className="flex items-center justify-center gap-1.5 rounded bg-accent-primary px-3 py-1.5 text-xs font-medium text-bg-primary transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <LinkIcon className="h-3 w-3" />
              )}
              {isPending ? "Submitting..." : "Submit source"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
