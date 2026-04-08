import Link from "next/link";
import { Users } from "lucide-react";
import { getBrowseArtists } from "@/lib/queries/artists";
import { AdminPagination } from "@/components/admin-pagination";
import { GenreChip } from "@/components/genre-chip";
import { EmptyState } from "@/components/empty-state";
import { ArtistSearch } from "./artist-search";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Artists | hausparty",
  description: "Browse DJ and electronic music artists on hausparty.",
};

interface Props {
  searchParams: Promise<{ page?: string; q?: string }>;
}

const PAGE_SIZE = 36;

export default async function ArtistsPage({ searchParams }: Props) {
  const { page, q } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);

  const { artists, total, pageSize } = await getBrowseArtists({
    page: currentPage,
    pageSize: PAGE_SIZE,
    search: q || undefined,
  });

  const totalPages = Math.ceil(total / pageSize);
  const extraParams: Record<string, string> = {};
  if (q) extraParams.q = q;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Artists</h1>
        <span className="text-sm text-text-tertiary">{total} artists</span>
      </div>

      <ArtistSearch initialQuery={q ?? ""} />

      {artists.length === 0 ? (
        <EmptyState
          icon={Users}
          message={q ? `No artists matching "${q}"` : "No artists found."}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
          {artists.map((artist) => (
            <Link
              key={artist.id}
              href={`/artists/${artist.slug}`}
              className="group flex flex-col items-center gap-2 rounded-lg border border-border-subtle bg-bg-surface p-3 transition-colors hover:bg-bg-surface-hover sm:p-4"
            >
              {/* Avatar */}
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-accent-primary/10 sm:h-16 sm:w-16">
                {artist.imageUrl ? (
                  <img
                    src={artist.imageUrl}
                    alt={artist.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-accent-primary/60">
                    {artist.name[0]?.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Name */}
              <span className="text-center text-sm font-medium text-text-primary group-hover:text-accent-primary">
                {artist.name}
              </span>

              {/* Set count */}
              {artist.setCount > 0 && (
                <span className="text-xs text-text-tertiary">
                  {artist.setCount} set{artist.setCount !== 1 ? "s" : ""}
                </span>
              )}

              {/* Genre chips */}
              {artist.genres.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1">
                  {artist.genres.map((g) => (
                    <span
                      key={g.id}
                      className="inline-flex max-w-[8rem] shrink-0 items-center truncate whitespace-nowrap rounded-full bg-bg-surface-hover px-2 py-0.5 text-[10px] text-text-tertiary"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath="/artists"
        extraParams={extraParams}
      />
    </div>
  );
}
