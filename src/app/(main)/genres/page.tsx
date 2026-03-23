import Link from "next/link";
import { Music } from "lucide-react";
import { getAllGenres } from "@/lib/queries/genres";
import { GenreChip } from "@/components/genre-chip";
import { EmptyState } from "@/components/empty-state";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Genres | hausparty",
  description: "Browse DJ sets by genre on hausparty.",
};

export default async function GenresPage() {
  const genres = await getAllGenres();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Genres</h1>
      {genres.length === 0 ? (
        <EmptyState
          icon={Music}
          message="No genres have been added yet."
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
        <div className="flex flex-wrap gap-3">
          {genres.map((genre) => (
            <GenreChip key={genre.id} name={genre.name} slug={genre.slug} />
          ))}
        </div>
      )}
    </div>
  );
}
