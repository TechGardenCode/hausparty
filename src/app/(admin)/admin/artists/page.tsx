import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getAdminArtists } from "@/lib/queries/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Artists | hausparty Admin",
};

interface Props {
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 25;

export default async function AdminArtistsPage({ searchParams }: Props) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const { artists, total, pageSize } = await getAdminArtists(
    currentPage,
    PAGE_SIZE
  );
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Artists</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/artists/duplicates"
            className="rounded border border-border-subtle px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
          >
            Find Duplicates
          </Link>
          <span className="text-sm text-text-tertiary">{total} total</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-text-tertiary">
              <th className="pb-3 pr-4 font-medium">Name</th>
              <th className="pb-3 pr-4 font-medium">Slug</th>
              <th className="pb-3 pr-4 font-medium">Sets</th>
              <th className="pb-3 font-medium">Genres</th>
            </tr>
          </thead>
          <tbody>
            {artists.map((artist) => (
              <tr
                key={artist.id}
                className="border-b border-border-subtle last:border-0"
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/artists/${artist.slug}`}
                      className="text-text-primary hover:text-accent-primary"
                    >
                      {artist.name}
                    </Link>
                    {artist.hasSimilarSlug && (
                      <span
                        title="Similar slug detected — possible duplicate"
                        className="flex items-center gap-0.5 rounded bg-accent-warm/15 px-1.5 py-0.5 text-[10px] font-medium text-accent-warm"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Similar
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4 font-mono text-xs text-text-tertiary">
                  {artist.slug}
                </td>
                <td className="py-3 pr-4 text-text-secondary">
                  {artist.setCount}
                </td>
                <td className="py-3 text-text-secondary">
                  {artist.genres.map((g) => g.name).join(", ") || "—"}
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
              href={`/admin/artists?page=${currentPage - 1}`}
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
              href={`/admin/artists?page=${currentPage + 1}`}
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
