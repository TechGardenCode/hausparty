"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, CheckCircle, XCircle, Search,
  AlertTriangle, Eye, Users,
} from "lucide-react";
import { AdminPagination } from "@/components/admin-pagination";
import { useToast } from "@/components/toast";
import { previewSetFromUrl, createSetFromDiscovery } from "@/lib/actions/discovery";
import type { PreviewResult } from "@/lib/actions/discovery";
import type { SearchUrls } from "@/lib/services/discovery/search-urls";

interface QueueItem {
  artistId: string;
  artistName: string;
  artistSlug: string;
  eventId: string;
  eventName: string;
  eventSlug: string;
  dateStart: string | null;
  venue: string | null;
  stage: string | null;
  festivalName: string | null;
  searchUrls: SearchUrls;
}

interface Props {
  items: QueueItem[];
  total: number;
  currentPage: number;
  totalPages: number;
}

export function DiscoveryQueue({ items, total, currentPage, totalPages }: Props) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Discovery</h1>
        <span className="text-sm text-text-tertiary">
          {total} artist/event pairs pending media
        </span>
      </div>

      <p className="text-sm text-text-secondary">
        Each row is an artist who played at an event but has no set recording linked yet.
        Click a search link, find the set, paste the URL, review the preview, then confirm.
      </p>

      {items.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-bg-surface p-8 text-center text-text-tertiary">
          No pending discovery items. Run the edmtrain scraper to populate the queue.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <DiscoveryRow
              key={`${item.artistId}-${item.eventId}`}
              item={item}
              onCreated={() => router.refresh()}
            />
          ))}
        </div>
      )}

      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        buildUrl={(page) => `/admin/discovery?page=${page}`}
      />
    </div>
  );
}

type RowState =
  | { phase: "idle" }
  | { phase: "previewing" }
  | { phase: "preview"; data: PreviewResult }
  | { phase: "creating" }
  | { phase: "done"; action: string };

function DiscoveryRow({
  item,
  onCreated,
}: {
  item: QueueItem;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<RowState>({ phase: "idle" });
  const [isPending, startTransition] = useTransition();
  // Track which B2B suggestions the admin has accepted
  const [acceptedB2B, setAcceptedB2B] = useState<string[]>([]);

  function handlePreview() {
    if (!url.trim()) return;
    startTransition(async () => {
      try {
        setState({ phase: "previewing" });
        const preview = await previewSetFromUrl({
          url: url.trim(),
          artistId: item.artistId,
          artistName: item.artistName,
          eventName: item.eventName,
          festivalName: item.festivalName ?? undefined,
        });
        setState({ phase: "preview", data: preview });

        // Pre-accept all B2B suggestions
        const b2bNames = preview.validation.suggestions
          .filter((s) => s.type === "add_b2b_artist")
          .map((s) => s.artistName);
        setAcceptedB2B(b2bNames);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed to preview URL", "error");
        setState({ phase: "idle" });
      }
    });
  }

  function handleConfirm() {
    if (state.phase !== "preview") return;
    startTransition(async () => {
      try {
        setState({ phase: "creating" });
        const res = await createSetFromDiscovery({
          url: url.trim(),
          artistId: item.artistId,
          eventId: item.eventId,
          performedAt: item.dateStart ?? undefined,
          b2bArtistNames: acceptedB2B.length > 0 ? acceptedB2B : undefined,
        });

        setState({ phase: "done", action: res.action });
        const statusLabel = res.status === "published" ? "published" : "draft";

        if (res.action === "created") {
          toast(`Set created (${statusLabel})${acceptedB2B.length > 0 ? ` with ${acceptedB2B.length} B2B artist(s)` : ""}`, "success");
        } else if (res.action === "added_source") {
          toast("Source added to existing set", "success");
        } else if (res.action === "duplicate") {
          toast("This URL already exists", "error");
        }

        setUrl("");
        onCreated();
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed to create set", "error");
        setState({ phase: "idle" });
      }
    });
  }

  function handleCancel() {
    setState({ phase: "idle" });
    setAcceptedB2B([]);
  }

  function toggleB2B(name: string) {
    setAcceptedB2B((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  // Completed state
  if (state.phase === "done") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-accent-positive/30 bg-accent-positive/5 px-4 py-3 text-sm">
        <CheckCircle className="h-4 w-4 shrink-0 text-accent-positive" />
        <span className="text-accent-positive">
          {item.artistName} @ {item.eventName} — {state.action === "created" ? "set created" : "source added"}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-4">
      {/* Header: metadata + search links */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">{item.artistName}</span>
            <span className="text-text-tertiary">@</span>
            <span className="text-text-secondary">{item.eventName}</span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-text-tertiary">
            {item.dateStart && <span>{item.dateStart}</span>}
            {item.venue && <span>{item.venue}</span>}
            {item.festivalName && (
              <span className="rounded bg-accent-primary/10 px-1.5 py-0.5 text-accent-primary">
                {item.festivalName}
              </span>
            )}
            {item.stage && <span>Stage: {item.stage}</span>}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {item.searchUrls.youtube.map((ytUrl, i) => (
            <a
              key={i}
              href={ytUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
            >
              <Search className="h-3 w-3" />
              YT{item.searchUrls.youtube.length > 1 ? i + 1 : ""}
            </a>
          ))}
          {item.searchUrls.soundcloud.map((scUrl, i) => (
            <a
              key={`sc-${i}`}
              href={scUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
            >
              <Search className="h-3 w-3" />
              SC
            </a>
          ))}
        </div>
      </div>

      {/* URL input + preview button */}
      <div className="mt-3 flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            // Reset preview when URL changes
            if (state.phase === "preview") setState({ phase: "idle" });
          }}
          placeholder="Paste YouTube or SoundCloud URL..."
          disabled={state.phase === "previewing" || state.phase === "creating"}
          className="flex-1 rounded border border-border-subtle bg-bg-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (state.phase === "preview") handleConfirm();
              else handlePreview();
            }
          }}
        />
        {state.phase !== "preview" ? (
          <button
            type="button"
            onClick={handlePreview}
            disabled={isPending || !url.trim()}
            className="flex items-center gap-1.5 rounded bg-bg-surface-hover px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-accent-primary/20 hover:text-accent-primary disabled:opacity-50"
          >
            {state.phase === "previewing" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {state.phase === "previewing" ? "Loading..." : "Preview"}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending || state.data.isDuplicate}
              className="flex items-center gap-1.5 rounded bg-accent-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Confirm
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded px-3 py-1.5 text-sm text-text-tertiary transition-colors hover:text-text-secondary"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Preview card */}
      {state.phase === "preview" && (
        <PreviewCard
          preview={state.data}
          acceptedB2B={acceptedB2B}
          onToggleB2B={toggleB2B}
        />
      )}
    </div>
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
  const hasWarnings = preview.validation.warnings.length > 0;
  const hasSuggestions = preview.validation.suggestions.length > 0;

  return (
    <div className={`mt-3 rounded-lg border p-3 ${
      preview.isDuplicate
        ? "border-accent-negative/30 bg-accent-negative/5"
        : hasWarnings
          ? "border-accent-warm/30 bg-accent-warm/5"
          : "border-accent-positive/30 bg-accent-positive/5"
    }`}>
      {/* Duplicate warning */}
      {preview.isDuplicate && (
        <div className="mb-3 flex items-center gap-2 text-sm text-accent-negative">
          <XCircle className="h-4 w-4 shrink-0" />
          This URL already exists in the catalog.
        </div>
      )}

      {/* Video metadata */}
      <div className="flex gap-3">
        {preview.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- discovery preview thumbs span many host-families; admin-only, LCP not a concern
          <img
            src={preview.thumbnailUrl}
            alt=""
            className="h-16 w-28 shrink-0 rounded object-cover"
          />
        )}
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-text-primary">{preview.title}</span>
          <div className="flex flex-wrap gap-3 text-xs text-text-tertiary">
            <span>{preview.channelName}</span>
            <span className={`rounded px-1.5 py-0.5 ${
              preview.sourceType === "official"
                ? "bg-accent-positive/15 text-accent-positive"
                : preview.sourceType === "artist"
                  ? "bg-accent-primary/15 text-accent-primary"
                  : "bg-bg-surface-hover text-text-secondary"
            }`}>
              {preview.sourceType}
            </span>
            {preview.isFullSet && (
              <span className="rounded bg-accent-primary/15 px-1.5 py-0.5 text-accent-primary">
                full set
              </span>
            )}
            {preview.parsedYear && <span>{preview.parsedYear}</span>}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {hasWarnings && (
        <div className="mt-3 flex flex-col gap-1.5">
          {preview.validation.warnings.map((w, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-xs ${
                w.severity === "warning" ? "text-accent-warm" : "text-accent-primary"
              }`}
            >
              {w.severity === "warning" ? (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Users className="h-3.5 w-3.5 shrink-0" />
              )}
              {w.message}
            </div>
          ))}
        </div>
      )}

      {/* Artist suggestions (B2B + supporting) */}
      {hasSuggestions && (
        <div className="mt-3 flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">
            Link additional artists:
          </span>
          {preview.validation.suggestions
            .filter((s) => s.type === "add_b2b_artist" || s.type === "add_supporting_artist")
            .map((s) => (
              <label
                key={s.artistName}
                className="flex items-center gap-2 text-xs text-text-primary"
              >
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

      {/* Confidence indicator */}
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
