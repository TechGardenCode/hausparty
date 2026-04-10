import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { searchSets, searchArtists, searchFestivals } from "@/lib/queries/search";
import { SetRow } from "@/components/set-row";
import { ArtistCard } from "@/components/artist-card";
import { FestivalCard } from "@/components/festival-card";
import { EmptyState } from "@/components/empty-state";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search | hausparty",
};

interface Props {
  searchParams: Promise<{ q?: string; tab?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, tab } = await searchParams;
  const query = q?.trim() || "";
  const activeTab = tab || "sets";

  if (!query) {
    return (
      <div className="flex flex-col gap-6">
        <SearchForm query="" />
        <EmptyState
          icon={SearchIcon}
          message="Search for sets, artists, or festivals"
        />
      </div>
    );
  }

  const [sets, artists, festivals] = await Promise.all([
    searchSets(query),
    searchArtists(query),
    searchFestivals(query),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <SearchForm query={query} />

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border-subtle">
        {[
          { key: "sets", label: "Sets", count: sets.length },
          { key: "artists", label: "Artists", count: artists.length },
          { key: "festivals", label: "Festivals", count: festivals.length },
        ].map(({ key, label, count }) => (
          <a
            key={key}
            href={`/search?q=${encodeURIComponent(query)}&tab=${key}`}
            className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
              activeTab === key
                ? "border-accent-primary text-accent-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {label} ({count})
          </a>
        ))}
      </div>

      {/* Results */}
      {activeTab === "sets" && (
        <div className="flex flex-col">
          {sets.length === 0 ? (
            <EmptyState
              icon={SearchIcon}
              message="No sets found"
              action={
                <Link
                  href="/submit"
                  className="text-sm text-accent-primary transition-colors hover:text-accent-primary/80"
                >
                  Can&apos;t find it? Submit a set
                </Link>
              }
            />
          ) : (
            sets.map((set) => (
              <SetRow
                key={set.id}
                slug={set.slug}
                artistNames={set.artists.map((a: { name: string }) => a.name)}
                eventName={set.event?.name || null}
                durationSeconds={set.duration_seconds}
                genreNames={set.genres.map((g: { name: string }) => g.name)}
                platform={set.sources[0]?.platform}
                sourceCount={set.sources.length}
                thumbnailUrl={set.thumbnailUrl}
              />
            ))
          )}
        </div>
      )}

      {activeTab === "artists" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {artists.length === 0 ? (
            <div className="col-span-full">
              <EmptyState icon={SearchIcon} message="No artists found" />
            </div>
          ) : (
            artists.map((artist) => (
              <ArtistCard
                key={artist.id}
                slug={artist.slug}
                name={artist.name}
                imageUrl={artist.image_url}
                genreNames={artist.genres.map((g) => g.name)}
                setCount={0}
              />
            ))
          )}
        </div>
      )}

      {activeTab === "festivals" && (
        <div className="flex flex-wrap gap-4">
          {festivals.length === 0 ? (
            <EmptyState icon={SearchIcon} message="No festivals found" />
          ) : (
            festivals.map((festival) => (
              <FestivalCard
                key={festival.id}
                slug={festival.slug}
                name={festival.name}
                imageUrl={festival.image_url}
                setCount={0}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SearchForm({ query }: { query: string }) {
  return (
    <form action="/search" className="flex gap-2">
      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <input
          name="q"
          type="text"
          defaultValue={query}
          placeholder="Search sets, artists, festivals..."
          className="w-full rounded-lg border border-border-subtle bg-bg-surface py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-bg-primary hover:opacity-90"
      >
        Search
      </button>
    </form>
  );
}
