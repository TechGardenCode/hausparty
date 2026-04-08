"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { AdminPagination } from "@/components/admin-pagination";
import { ScrollableTable } from "@/components/scrollable-table";
import { formatRelativeDate } from "@/lib/utils";
import { useToast } from "@/components/toast";
import { bulkAssignGenre, publishSets, unpublishSets } from "@/lib/actions/admin";

type SetRow = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  created_at: Date;
  performed_at: Date | null;
  artists: { id: string; name: string; slug: string }[];
  genres: { id: string; name: string; slug: string }[];
  event: { id: string; name: string; slug: string } | null;
  sourceCount: number;
};

type GenreOption = { id: string; name: string; slug: string };

interface Props {
  sets: SetRow[];
  total: number;
  currentPage: number;
  totalPages: number;
  allGenres: GenreOption[];
  statusFilter?: "draft" | "published";
}

export function SetsTable({ sets, total, currentPage, totalPages, allGenres, statusFilter }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkGenreId, setBulkGenreId] = useState("");
  const [isPending, startTransition] = useTransition();

  const allSelected = sets.length > 0 && selected.size === sets.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sets.map((s) => s.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkAssign() {
    if (!bulkGenreId || selected.size === 0) return;
    startTransition(async () => {
      try {
        await bulkAssignGenre(Array.from(selected), bulkGenreId);
        toast(`Genre assigned to ${selected.size} set(s)`, "success");
        setSelected(new Set());
        setBulkGenreId("");
        router.refresh();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Failed to assign genre", "error");
      }
    });
  }

  function handleBulkPublish() {
    if (selected.size === 0) return;
    startTransition(async () => {
      try {
        await publishSets(Array.from(selected));
        toast(`${selected.size} set(s) published`, "success");
        setSelected(new Set());
        router.refresh();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Failed to publish", "error");
      }
    });
  }

  function handleBulkUnpublish() {
    if (selected.size === 0) return;
    startTransition(async () => {
      try {
        await unpublishSets(Array.from(selected));
        toast(`${selected.size} set(s) unpublished`, "success");
        setSelected(new Set());
        router.refresh();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Failed to unpublish", "error");
      }
    });
  }

  function buildPageUrl(page: number) {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (statusFilter) params.set("status", statusFilter);
    const qs = params.toString();
    return `/admin/sets${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sets</h1>
        <span className="text-sm text-text-tertiary">{total} total</span>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2">
        {[
          { label: "All", value: undefined },
          { label: "Published", value: "published" as const },
          { label: "Draft", value: "draft" as const },
        ].map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `/admin/sets?status=${tab.value}` : "/admin/sets"}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? "bg-accent-primary/20 text-accent-primary"
                : "text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-accent-primary/30 bg-accent-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-accent-primary">
            {selected.size} selected
          </span>
          <select
            value={bulkGenreId}
            onChange={(e) => setBulkGenreId(e.target.value)}
            className="rounded border border-border-subtle bg-bg-primary px-3 py-1.5 text-sm text-text-primary"
          >
            <option value="">Select genre...</option>
            {allGenres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleBulkAssign}
            disabled={!bulkGenreId || isPending}
            className="rounded bg-accent-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Assigning..." : "Assign genre"}
          </button>
          <div className="h-4 w-px bg-border-subtle" />
          <button
            type="button"
            onClick={handleBulkPublish}
            disabled={isPending}
            className="rounded bg-accent-positive/20 px-3 py-1.5 text-sm font-medium text-accent-positive disabled:opacity-50"
          >
            Publish
          </button>
          <button
            type="button"
            onClick={handleBulkUnpublish}
            disabled={isPending}
            className="rounded bg-accent-warm/20 px-3 py-1.5 text-sm font-medium text-accent-warm disabled:opacity-50"
          >
            Unpublish
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-sm text-text-tertiary hover:text-text-secondary"
          >
            Clear
          </button>
        </div>
      )}

      <ScrollableTable>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-text-tertiary">
              <th className="pb-3 pr-3 font-medium">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded accent-accent-primary"
                />
              </th>
              <th className="pb-3 pr-4 font-medium">Title</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 pr-4 font-medium">Artists</th>
              <th className="pb-3 pr-4 font-medium">Event</th>
              <th className="pb-3 pr-4 font-medium">Genres</th>
              <th className="pb-3 pr-4 font-medium">Sources</th>
              <th className="pb-3 pr-4 font-medium">Created</th>
              <th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {sets.map((set) => (
              <tr
                key={set.id}
                className="border-b border-border-subtle last:border-0"
              >
                <td className="py-3 pr-3">
                  <input
                    type="checkbox"
                    checked={selected.has(set.id)}
                    onChange={() => toggleOne(set.id)}
                    className="h-4 w-4 rounded accent-accent-primary"
                  />
                </td>
                <td className="max-w-[250px] truncate py-3 pr-4">
                  <Link
                    href={`/sets/${set.slug}`}
                    className="text-text-primary hover:text-accent-primary"
                  >
                    {set.title}
                  </Link>
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      set.status === "published"
                        ? "bg-accent-positive/15 text-accent-positive"
                        : "bg-accent-warm/15 text-accent-warm"
                    }`}
                  >
                    {set.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-text-secondary">
                  {set.artists.map((a) => a.name).join(", ") || "—"}
                </td>
                <td className="py-3 pr-4 text-text-secondary">
                  {set.event?.name || "—"}
                </td>
                <td className="py-3 pr-4">
                  {set.genres.length === 0 ? (
                    <span className="rounded-full bg-accent-negative/15 px-2 py-0.5 text-xs font-medium text-accent-negative">
                      0
                    </span>
                  ) : (
                    <span className="text-text-secondary">
                      {set.genres.map((g) => g.name).join(", ")}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 text-text-secondary">
                  {set.sourceCount}
                </td>
                <td className="py-3 pr-4 text-text-tertiary">
                  {formatRelativeDate(set.created_at)}
                </td>
                <td className="py-3 pl-2 pr-4">
                  <Link
                    href={`/admin/sets/${set.id}/edit`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-surface-hover hover:text-accent-primary"
                    title="Edit"
                    aria-label="Edit set"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTable>

      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        buildUrl={buildPageUrl}
      />
    </div>
  );
}
