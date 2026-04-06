"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Loader2, CheckCircle, XCircle, Plus, ExternalLink, Eye, Users, AlertTriangle,
} from "lucide-react";
import { useToast } from "@/components/toast";
import {
  resolveDiscoveryQuery,
  createDiscoveryArtist,
  createDiscoveryEvent,
  previewSetFromUrl,
  createSetFromDiscovery,
} from "@/lib/actions/discovery";
import type { PreviewResult } from "@/lib/actions/discovery";
import type { ResolvedQuery } from "@/lib/services/discovery/resolve-query";

type Phase =
  | { step: "idle" }
  | { step: "resolving" }
  | { step: "resolved"; query: ResolvedQuery }
  | { step: "previewing" }
  | { step: "preview"; query: ResolvedQuery; preview: PreviewResult }
  | { step: "creating" }
  | { step: "done"; action: string };

export function ManualSearch() {
  const router = useRouter();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const [isPending, startTransition] = useTransition();
  const [acceptedB2B, setAcceptedB2B] = useState<string[]>([]);

  // Track created entities for the confirm step
  const [resolvedArtistId, setResolvedArtistId] = useState<string | null>(null);
  const [resolvedEventId, setResolvedEventId] = useState<string | null>(null);

  function handleResolve() {
    if (!input.trim()) return;
    startTransition(async () => {
      try {
        setPhase({ step: "resolving" });
        const result = await resolveDiscoveryQuery(input.trim());
        setPhase({ step: "resolved", query: result });
        setResolvedArtistId(result.artist?.id ?? null);
        setResolvedEventId(result.event?.id ?? null);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Resolution failed", "error");
        setPhase({ step: "idle" });
      }
    });
  }

  function handlePreview() {
    if (!url.trim() || !resolvedArtistId) return;
    const query = phase.step === "resolved" ? phase.query : null;
    if (!query) return;

    startTransition(async () => {
      try {
        setPhase({ step: "previewing" });
        const preview = await previewSetFromUrl({
          url: url.trim(),
          artistId: resolvedArtistId!,
          artistName: query.artist?.name ?? input,
          eventName: query.event?.name,
          festivalName: query.festival?.name,
        });
        setPhase({ step: "preview", query, preview });
        const b2b = preview.validation.suggestions
          .filter((s) => s.type === "add_b2b_artist")
          .map((s) => s.artistName);
        setAcceptedB2B(b2b);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Preview failed", "error");
        setPhase({ step: "resolved", query: query! });
      }
    });
  }

  function handleConfirm() {
    if (phase.step !== "preview" || !resolvedArtistId) return;
    startTransition(async () => {
      try {
        setPhase({ step: "creating" });
        const res = await createSetFromDiscovery({
          url: url.trim(),
          artistId: resolvedArtistId!,
          eventId: resolvedEventId ?? undefined,
          b2bArtistNames: acceptedB2B.length > 0 ? acceptedB2B : undefined,
        });
        setPhase({ step: "done", action: res.action });
        const statusLabel = res.status === "published" ? "published" : "draft";
        toast(`Set created (${statusLabel})`, "success");
        router.refresh();
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed to create set", "error");
        setPhase({ step: "idle" });
      }
    });
  }

  function handleCreateArtist(name: string) {
    startTransition(async () => {
      try {
        const result = await createDiscoveryArtist(name);
        setResolvedArtistId(result.id);
        toast(`Artist "${result.name}" created`, "success");
        // Re-resolve to update the display
        if (phase.step === "resolved") {
          setPhase({
            step: "resolved",
            query: {
              ...phase.query,
              artist: { id: result.id, name: result.name, confidence: "exact" },
              unmatched: phase.query.unmatched.filter(
                (w) => !name.toLowerCase().includes(w.toLowerCase())
              ),
            },
          });
        }
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed to create artist", "error");
      }
    });
  }

  function handleCreateEvent(name: string) {
    startTransition(async () => {
      try {
        const query = phase.step === "resolved" ? phase.query : null;
        const result = await createDiscoveryEvent({
          name,
          festivalId: query?.festival?.id,
          venue: query?.venue,
          artistId: resolvedArtistId ?? undefined,
        });
        setResolvedEventId(result.id);
        toast(`Event "${result.name}" created`, "success");
        if (phase.step === "resolved") {
          setPhase({
            step: "resolved",
            query: {
              ...phase.query,
              event: { id: result.id, name: result.name },
            },
          });
        }
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed to create event", "error");
      }
    });
  }

  function reset() {
    setPhase({ step: "idle" });
    setUrl("");
    setAcceptedB2B([]);
    setResolvedArtistId(null);
    setResolvedEventId(null);
  }

  if (phase.step === "done") {
    return (
      <div className="rounded-lg border border-border-subtle bg-bg-surface p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-accent-positive">
            <CheckCircle className="h-4 w-4" />
            Set created from manual search
          </div>
          <button onClick={reset} className="text-xs text-text-tertiary hover:text-text-secondary">
            Search again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-5">
      <h2 className="mb-3 text-lg font-semibold">Manual Search</h2>
      <p className="mb-4 text-xs text-text-tertiary">
        Search for artists/events not in the queue. Try: &quot;worship redrocks&quot;, &quot;Tiesto EDC 2024&quot;
      </p>

      {/* Search input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (phase.step !== "idle") reset();
          }}
          placeholder="Artist name, festival, venue, year..."
          disabled={phase.step === "resolving"}
          className="flex-1 rounded border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleResolve();
          }}
        />
        <button
          type="button"
          onClick={handleResolve}
          disabled={isPending || !input.trim()}
          className="flex items-center gap-1.5 rounded bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
        >
          {phase.step === "resolving" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Resolve
        </button>
      </div>

      {/* Resolution results */}
      {(phase.step === "resolved" || phase.step === "previewing" || phase.step === "preview" || phase.step === "creating") && (
        <div className="mt-4 flex flex-col gap-3">
          {/* Resolved entities */}
          <div className="flex flex-wrap gap-3 text-sm">
            {/* Artist */}
            <ResolutionChip
              label="Artist"
              value={phase.step === "resolved" || phase.step === "preview" || phase.step === "previewing" || phase.step === "creating"
                ? (("query" in phase ? phase.query.artist?.name : null) ?? null)
                : null}
              confidence={"query" in phase ? phase.query.artist?.confidence : undefined}
              onCreateFallback={
                !("query" in phase && phase.query.artist)
                  ? () => handleCreateArtist(input.split(/\s+/)[0] ?? input)
                  : undefined
              }
              createLabel={input.split(/\s+/)[0] ?? input}
              isPending={isPending}
            />

            {/* Event */}
            <ResolutionChip
              label="Event"
              value={"query" in phase ? (phase.query.event?.name ?? null) : null}
              onCreateFallback={
                !("query" in phase && phase.query.event) && resolvedArtistId
                  ? () => {
                      const q = "query" in phase ? phase.query : null;
                      const name = q?.unmatched?.join(" ") || input;
                      handleCreateEvent(name);
                    }
                  : undefined
              }
              createLabel={"query" in phase ? (phase.query.unmatched?.join(" ") || "event") : "event"}
              isPending={isPending}
            />

            {/* Festival */}
            {"query" in phase && phase.query.festival && (
              <span className="rounded bg-accent-primary/10 px-2 py-1 text-xs text-accent-primary">
                Festival: {phase.query.festival.name}
              </span>
            )}

            {/* Venue */}
            {"query" in phase && phase.query.venue && (
              <span className="rounded bg-bg-surface-hover px-2 py-1 text-xs text-text-secondary">
                Venue: {phase.query.venue}
              </span>
            )}

            {/* Year */}
            {"query" in phase && phase.query.year && (
              <span className="rounded bg-bg-surface-hover px-2 py-1 text-xs text-text-secondary">
                {phase.query.year}
              </span>
            )}
          </div>

          {/* Search links */}
          {"query" in phase && (
            <div className="flex flex-wrap gap-2">
              {phase.query.searchUrls.youtube.map((ytUrl, i) => (
                <a
                  key={i}
                  href={ytUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
                >
                  <ExternalLink className="h-3 w-3" />
                  YouTube {i + 1}
                </a>
              ))}
              {phase.query.searchUrls.soundcloud.map((scUrl, i) => (
                <a
                  key={`sc-${i}`}
                  href={scUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
                >
                  <ExternalLink className="h-3 w-3" />
                  SoundCloud
                </a>
              ))}
            </div>
          )}

          {/* URL paste + preview */}
          {resolvedArtistId && (
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (phase.step === "preview") {
                    const q = phase.query;
                    setPhase({ step: "resolved", query: q });
                  }
                }}
                placeholder="Paste YouTube or SoundCloud URL..."
                disabled={phase.step === "previewing" || phase.step === "creating"}
                className="flex-1 rounded border border-border-subtle bg-bg-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (phase.step === "preview") handleConfirm();
                    else handlePreview();
                  }
                }}
              />
              {phase.step !== "preview" ? (
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={isPending || !url.trim()}
                  className="flex items-center gap-1.5 rounded bg-bg-surface-hover px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-accent-primary/20 disabled:opacity-50"
                >
                  {phase.step === "previewing" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  Preview
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isPending || phase.preview.isDuplicate}
                    className="flex items-center gap-1.5 rounded bg-accent-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {phase.step === "creating" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5" />
                    )}
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhase({ step: "resolved", query: phase.query })}
                    className="text-sm text-text-tertiary hover:text-text-secondary"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Preview card */}
          {phase.step === "preview" && (
            <PreviewCard
              preview={phase.preview}
              acceptedB2B={acceptedB2B}
              onToggleB2B={(name) =>
                setAcceptedB2B((prev) =>
                  prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
                )
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

function ResolutionChip({
  label,
  value,
  confidence,
  onCreateFallback,
  createLabel,
  isPending,
}: {
  label: string;
  value: string | null;
  confidence?: "exact" | "fuzzy" | "alias";
  onCreateFallback?: () => void;
  createLabel?: string;
  isPending: boolean;
}) {
  if (value) {
    return (
      <span className="flex items-center gap-1.5 rounded bg-accent-positive/10 px-2 py-1 text-xs">
        <CheckCircle className="h-3 w-3 text-accent-positive" />
        <span className="text-text-secondary">{label}:</span>
        <span className="font-medium text-text-primary">{value}</span>
        {confidence && confidence !== "exact" && (
          <span className="text-text-tertiary">({confidence})</span>
        )}
      </span>
    );
  }

  if (onCreateFallback) {
    return (
      <button
        type="button"
        onClick={onCreateFallback}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded border border-dashed border-accent-warm/50 bg-accent-warm/5 px-2 py-1 text-xs text-accent-warm transition-colors hover:bg-accent-warm/10 disabled:opacity-50"
      >
        <Plus className="h-3 w-3" />
        Create {label}: {createLabel}
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5 rounded bg-bg-surface-hover px-2 py-1 text-xs text-text-tertiary">
      <XCircle className="h-3 w-3" />
      {label}: not found
    </span>
  );
}

function PreviewCard({
  preview,
  acceptedB2B,
  onToggleB2B,
}: {
  preview: PreviewResult;
  acceptedB2B: string[];
  onToggleB2B: (name: string) => void;
}) {
  return (
    <div className={`rounded-lg border p-3 ${
      preview.isDuplicate
        ? "border-accent-negative/30 bg-accent-negative/5"
        : preview.validation.warnings.length > 0
          ? "border-accent-warm/30 bg-accent-warm/5"
          : "border-accent-positive/30 bg-accent-positive/5"
    }`}>
      {preview.isDuplicate && (
        <div className="mb-3 flex items-center gap-2 text-sm text-accent-negative">
          <XCircle className="h-4 w-4 shrink-0" />
          This URL already exists in the catalog.
        </div>
      )}

      <div className="flex gap-3">
        {preview.thumbnailUrl && (
          <img src={preview.thumbnailUrl} alt="" className="h-16 w-28 shrink-0 rounded object-cover" />
        )}
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-text-primary">{preview.title}</span>
          <div className="flex flex-wrap gap-2 text-xs text-text-tertiary">
            <span>{preview.channelName}</span>
            <span className={`rounded px-1.5 py-0.5 ${
              preview.sourceType === "official" ? "bg-accent-positive/15 text-accent-positive"
                : preview.sourceType === "artist" ? "bg-accent-primary/15 text-accent-primary"
                : "bg-bg-surface-hover text-text-secondary"
            }`}>{preview.sourceType}</span>
            {preview.isFullSet && (
              <span className="rounded bg-accent-primary/15 px-1.5 py-0.5 text-accent-primary">full set</span>
            )}
          </div>
        </div>
      </div>

      {preview.validation.warnings.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {preview.validation.warnings.map((w, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs ${
              w.severity === "warning" ? "text-accent-warm" : "text-accent-primary"
            }`}>
              {w.severity === "warning" ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> : <Users className="h-3.5 w-3.5 shrink-0" />}
              {w.message}
            </div>
          ))}
        </div>
      )}

      {preview.validation.suggestions.filter((s) => s.type === "add_b2b_artist" || s.type === "add_supporting_artist").length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          <span className="text-xs font-medium text-text-secondary">Link additional artists:</span>
          {preview.validation.suggestions
            .filter((s) => s.type === "add_b2b_artist" || s.type === "add_supporting_artist")
            .map((s) => (
              <label key={s.artistName} className="flex items-center gap-2 text-xs text-text-primary">
                <input
                  type="checkbox"
                  checked={acceptedB2B.includes(s.artistName)}
                  onChange={() => onToggleB2B(s.artistName)}
                  className="rounded"
                />
                {s.artistName}
                {s.type === "add_b2b_artist" && (
                  <span className="text-text-tertiary">(B2B)</span>
                )}
              </label>
            ))}
        </div>
      )}

      {!preview.isDuplicate && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="text-text-tertiary">Match:</span>
          <div className="h-2 w-24 overflow-hidden rounded-full bg-bg-primary">
            <div
              className={`h-full rounded-full transition-all ${
                preview.validation.confidence >= 0.8
                  ? "bg-accent-positive"
                  : preview.validation.confidence >= 0.5
                    ? "bg-accent-warm"
                    : "bg-accent-negative"
              }`}
              style={{ width: `${preview.validation.confidence * 100}%` }}
            />
          </div>
          <span className={`font-medium ${
            preview.validation.confidence >= 0.8
              ? "text-accent-positive"
              : preview.validation.confidence >= 0.5
                ? "text-accent-warm"
                : "text-accent-negative"
          }`}>{Math.round(preview.validation.confidence * 100)}%</span>
        </div>
      )}
    </div>
  );
}
