"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, CheckCircle, XCircle, Search } from "lucide-react";
import { AdminPagination } from "@/components/admin-pagination";
import { useToast } from "@/components/toast";
import { createSetFromDiscovery } from "@/lib/actions/discovery";
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
  const { toast } = useToast();

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
        Click the search links to find the set on YouTube or SoundCloud, then paste the URL.
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
              onCreated={() => {
                router.refresh();
              }}
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

function DiscoveryRow({
  item,
  onCreated,
}: {
  item: QueueItem;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ action: string } | null>(null);

  function handleCreate() {
    if (!url.trim()) return;

    startTransition(async () => {
      try {
        const res = await createSetFromDiscovery({
          url: url.trim(),
          artistId: item.artistId,
          eventId: item.eventId,
          performedAt: item.dateStart ?? undefined,
        });

        setResult({ action: res.action });

        if (res.action === "created") {
          const statusLabel = res.status === "published" ? "published" : "draft";
          toast(`Set created (${statusLabel})`, "success");
        } else if (res.action === "added_source") {
          toast("Source added to existing set", "success");
        } else if (res.action === "duplicate") {
          toast("This URL already exists in the catalog", "error");
        }

        setUrl("");
        onCreated();
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed to create set", "error");
      }
    });
  }

  if (result?.action === "created" || result?.action === "added_source") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-accent-positive/30 bg-accent-positive/5 px-4 py-3 text-sm">
        <CheckCircle className="h-4 w-4 shrink-0 text-accent-positive" />
        <span className="text-accent-positive">
          {item.artistName} @ {item.eventName} — {result.action === "created" ? "set created" : "source added"}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Metadata */}
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

        {/* Search links */}
        <div className="flex shrink-0 gap-2">
          {item.searchUrls.youtube.map((ytUrl, i) => (
            <a
              key={i}
              href={ytUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
              title={`YouTube search ${i + 1}`}
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

      {/* URL paste input */}
      <div className="mt-3 flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste YouTube or SoundCloud URL..."
          disabled={isPending}
          className="flex-1 rounded border border-border-subtle bg-bg-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending || !url.trim()}
          className="flex items-center gap-1.5 rounded bg-accent-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ExternalLink className="h-3.5 w-3.5" />
          )}
          {isPending ? "Creating..." : "Create Set"}
        </button>

        {result?.action === "duplicate" && (
          <div className="flex items-center gap-1 text-xs text-accent-negative">
            <XCircle className="h-3.5 w-3.5" />
            Duplicate
          </div>
        )}
      </div>
    </div>
  );
}
