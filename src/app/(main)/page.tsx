import Link from "next/link";
import { Disc } from "lucide-react";
import { getTrendingSets, getNewSets } from "@/lib/queries/sets";
import { getAllGenres } from "@/lib/queries/genres";
import { getAllFestivals } from "@/lib/queries/festivals";
import { SetCard } from "@/components/set-card";
import { SetRow } from "@/components/set-row";
import { GenreChip } from "@/components/genre-chip";
import { FestivalCard } from "@/components/festival-card";
import { SectionHeader } from "@/components/section-header";
import { HorizontalScroll } from "@/components/horizontal-scroll";
import { EmptyState } from "@/components/empty-state";
import { getFestivalSetCount } from "@/lib/queries/festivals";

export default async function HomePage() {
  const [trending, recent, genres, festivals] = await Promise.all([
    getTrendingSets(10),
    getNewSets(10),
    getAllGenres(),
    getAllFestivals(),
  ]);

  const festivalCounts = await Promise.all(
    festivals.map((f) => getFestivalSetCount(f.id))
  );

  const allEmpty =
    trending.length === 0 &&
    recent.length === 0 &&
    genres.length === 0 &&
    festivals.length === 0;

  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <div className="flex flex-col gap-2 pt-4">
        <h1 className="text-3xl font-bold tracking-tight">
          haus<span className="text-accent-primary">·</span>party
        </h1>
        <p className="text-text-secondary">
          Discover live DJ sets from festivals, raves, and club events worldwide.
        </p>
      </div>

      {allEmpty ? (
        <EmptyState
          icon={Disc}
          message="No content yet. Be the first to contribute."
          action={
            <Link
              href="/submit"
              className="text-sm font-medium text-accent-primary hover:underline"
            >
              Submit a set
            </Link>
          }
        />
      ) : (
        <>
          {/* Trending Now */}
          {trending.length > 0 && (
            <section className="flex flex-col gap-4">
              <SectionHeader title="Trending Now" />
              <HorizontalScroll>
                {trending.map((set) => (
                  <SetCard
                    key={set.id}
                    slug={set.slug}
                    title={set.title}
                    artistNames={set.artists.map((a: { name: string }) => a.name)}
                    eventName={set.event?.name || null}
                    durationSeconds={set.duration_seconds}
                    platform={set.sources[0]?.platform}
                    thumbnailUrl={set.thumbnailUrl}
                  />
                ))}
              </HorizontalScroll>
            </section>
          )}

          {/* New This Week */}
          {recent.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionHeader title="New This Week" />
              <div className="flex flex-col">
                {recent.map((set) => (
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
                ))}
              </div>
            </section>
          )}

          {/* Browse by Genre */}
          {genres.length > 0 && (
            <section className="flex flex-col gap-4">
              <SectionHeader title="Browse by Genre" href="/genres" />
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <GenreChip key={genre.id} name={genre.name} slug={genre.slug} />
                ))}
              </div>
            </section>
          )}

          {/* Explore Festivals */}
          {festivals.length > 0 && (
            <section className="flex flex-col gap-4">
              <SectionHeader title="Explore Festivals" />
              <HorizontalScroll>
                {festivals.map((festival, i) => (
                  <FestivalCard
                    key={festival.id}
                    slug={festival.slug}
                    name={festival.name}
                    imageUrl={festival.image_url}
                    setCount={festivalCounts[i]}
                  />
                ))}
              </HorizontalScroll>
            </section>
          )}
        </>
      )}
    </div>
  );
}
