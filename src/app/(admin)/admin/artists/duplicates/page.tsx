import Link from "next/link";
import { ArrowLeft, Merge } from "lucide-react";
import { findDuplicateArtists } from "@/lib/actions/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Duplicate Artists | hausparty Admin",
};

export default async function DuplicateArtistsPage() {
  const duplicates = await findDuplicateArtists();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/artists"
          className="text-text-tertiary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Duplicate Artists</h1>
        <span className="text-sm text-text-tertiary">
          {duplicates.length} potential {duplicates.length === 1 ? "pair" : "pairs"}
        </span>
      </div>

      {duplicates.length === 0 ? (
        <p className="text-text-secondary">
          No duplicate artists detected above the similarity threshold.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-text-tertiary">
                <th className="pb-3 pr-4 font-medium">Artist 1</th>
                <th className="pb-3 pr-4 font-medium">Artist 2</th>
                <th className="pb-3 pr-4 font-medium">Similarity</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {duplicates.map((pair) => (
                <tr
                  key={`${pair.artist1_id}-${pair.artist2_id}`}
                  className="border-b border-border-subtle last:border-0"
                >
                  <td className="py-3 pr-4 text-text-primary">
                    {pair.artist1_name}
                  </td>
                  <td className="py-3 pr-4 text-text-primary">
                    {pair.artist2_name}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        pair.sim >= 0.9
                          ? "bg-accent-negative/15 text-accent-negative"
                          : pair.sim >= 0.8
                            ? "bg-accent-warm/15 text-accent-warm"
                            : "bg-bg-surface text-text-secondary"
                      }`}
                    >
                      {(pair.sim * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-3">
                    <Link
                      href={`/admin/artists/merge?canonical=${pair.artist1_id}&duplicate=${pair.artist2_id}`}
                      className="inline-flex items-center gap-1.5 rounded bg-accent-primary/15 px-2.5 py-1 text-xs font-medium text-accent-primary transition-colors hover:bg-accent-primary/25"
                    >
                      <Merge className="h-3 w-3" />
                      Merge
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
