"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { useToast } from "@/components/toast";
import { bulkAssignGenre } from "@/lib/actions/admin";

type SetRow = {
  id: string;
  title: string;
  slug: string;
  created_at: string;
  performed_at: string | null;
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
}

export function SetsTable({ sets, total, currentPage, totalPages, allGenres }: Props) {
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sets</h1>
        <span className="text-sm text-text-tertiary">{total} total</span>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-accent-primary/30 bg-accent-primary/5 px-4 py-3">
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
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-sm text-text-tertiary hover:text-text-secondary"
          >
            Clear
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-text-tertiary">
              <th className="pb-3 pr-3 font-medium">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
              <th className="pb-3 pr-4 font-medium">Title</th>
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
                    className="rounded"
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
                <td className="py-3">
                  <Link
                    href={`/admin/sets/${set.id}/edit`}
                    className="rounded p-1 text-text-tertiary hover:text-accent-primary"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          {currentPage > 1 && (
            <Link
              href={`/admin/sets?page=${currentPage - 1}`}
              className="rounded border border-border-subtle px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-text-tertiary">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={`/admin/sets?page=${currentPage + 1}`}
              className="rounded border border-border-subtle px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
