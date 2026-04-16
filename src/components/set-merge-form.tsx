"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Search, AlertTriangle, CheckCircle } from "lucide-react";
import {
  searchSetsForMergeTarget,
  previewMerge,
  mergeSet,
  type MergePreview,
  type MergeTargetOption,
} from "@/lib/actions/admin-merge";
import { useToast } from "@/components/toast";

interface Props {
  from: { id: string; title: string; slug: string };
  suggestedTarget: { id: string; title: string; slug: string } | null;
}

export function SetMergeForm({ from, suggestedTarget }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MergeTargetOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<
    { id: string; title: string; slug: string } | null
  >(suggestedTarget);
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [merging, startMerging] = useTransition();

  async function runSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const rows = await searchSetsForMergeTarget(value, from.id);
      setResults(rows);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Search failed", "error");
    } finally {
      setSearching(false);
    }
  }

  async function pickTarget(target: { id: string; title: string; slug: string }) {
    setSelected(target);
    setPreview(null);
    setPreviewing(true);
    try {
      const p = await previewMerge(from.id, target.id);
      setPreview(p);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Preview failed", "error");
    } finally {
      setPreviewing(false);
    }
  }

  function confirmMerge() {
    if (!selected) return;
    if (!confirm(`Merge "${from.title}" into "${selected.title}"? This cannot be undone automatically.`)) {
      return;
    }
    startMerging(async () => {
      try {
        const result = await mergeSet(from.id, selected.id);
        toast(
          `Merged — ${result.moved.sources} sources, ${result.moved.saves} saves moved.`,
          "success"
        );
        router.push(`/sets/${selected.slug}`);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Merge failed", "error");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Source set summary */}
      <section className="rounded-lg border border-border-subtle bg-bg-surface p-4">
        <h2 className="text-sm font-semibold text-text-secondary">Merging from</h2>
        <div className="mt-1 font-medium">{from.title}</div>
        <Link
          href={`/sets/${from.slug}`}
          className="text-xs text-text-tertiary hover:text-accent-primary"
        >
          /sets/{from.slug}
        </Link>
      </section>

      {/* Target picker */}
      <section className="rounded-lg border border-border-subtle bg-bg-surface p-4">
        <h2 className="text-sm font-semibold text-text-secondary">Merge into</h2>
        {selected ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">{selected.title}</div>
              <div className="text-xs text-text-tertiary">/sets/{selected.slug}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setPreview(null);
              }}
              className="text-xs text-text-tertiary hover:text-accent-primary"
            >
              change
            </button>
          </div>
        ) : (
          <>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={query}
                onChange={(e) => runSearch(e.target.value)}
                placeholder="Search for the canonical set by title..."
                className="w-full rounded border border-border-subtle bg-bg-primary py-2 pl-9 pr-3 text-sm"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-tertiary" />
              )}
            </div>
            {results.length > 0 && (
              <ul className="mt-2 max-h-72 divide-y divide-border-subtle overflow-y-auto rounded border border-border-subtle">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => pickTarget({ id: r.id, title: r.title, slug: r.slug })}
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-bg-surface-hover"
                    >
                      <span className="font-medium">{r.title}</span>
                      <span className="text-xs text-text-tertiary">
                        {r.artistNames || "—"} · {r.status}
                        {r.performedAt
                          ? ` · ${new Date(r.performedAt).toLocaleDateString()}`
                          : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* Preview */}
      {previewing && (
        <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-surface p-4 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading preview...
        </div>
      )}

      {preview && (
        <section className="rounded-lg border border-border-subtle bg-bg-surface p-4">
          <h2 className="text-sm font-semibold text-text-secondary">What moves</h2>
          {preview.blockers.length > 0 ? (
            <div className="mt-3 flex items-start gap-2 rounded border border-accent-negative/30 bg-accent-negative/10 p-3 text-sm text-accent-negative">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <ul className="space-y-1">
                {preview.blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ) : (
            <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-text-secondary">
              <li>
                Sources moving: <span className="font-medium text-text-primary">{preview.willMove.sources}</span>
              </li>
              <li>
                URL duplicates dropped: <span className="font-medium text-text-primary">{preview.willMove.sourceUrlCollisions}</span>
              </li>
              <li>
                New artists added: <span className="font-medium text-text-primary">{preview.willMove.artists}</span>
              </li>
              <li>
                New saves merged: <span className="font-medium text-text-primary">{preview.willMove.saves}</span>
              </li>
              <li>
                Collection memberships: <span className="font-medium text-text-primary">{preview.willMove.collectionMemberships}</span>
              </li>
              <li>
                Tracklist entries dropped: <span className="font-medium text-accent-warm">{preview.willMove.tracklistDropped}</span>
              </li>
            </ul>
          )}
        </section>
      )}

      {/* Confirm */}
      {preview && preview.blockers.length === 0 && (
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/admin/sets"
            className="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-surface-hover"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={confirmMerge}
            disabled={merging}
            className="inline-flex items-center gap-2 rounded-lg bg-accent-warm px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {merging ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            {merging ? "Merging..." : "Confirm merge"}
          </button>
        </div>
      )}
    </div>
  );
}
