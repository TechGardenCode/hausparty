import { db } from "@/lib/db";
import { artistGenres, setGenres } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

/**
 * Copy genres from an artist's existing associations to a new set.
 *
 * If multiple artist IDs are provided, genres are collected across all.
 * Uses onConflictDoNothing for idempotency.
 *
 * @returns Number of genres assigned.
 */
export async function inferGenresForSet(
  setId: string,
  artistIds: string[]
): Promise<number> {
  if (artistIds.length === 0) return 0;

  // Get all genre IDs associated with these artists
  const rows = await db
    .select({ genreId: artistGenres.genreId })
    .from(artistGenres)
    .where(inArray(artistGenres.artistId, artistIds));

  // Deduplicate genre IDs
  const genreIds = [...new Set(rows.map((r) => r.genreId))];

  if (genreIds.length === 0) return 0;

  // Insert set_genres rows
  await db
    .insert(setGenres)
    .values(genreIds.map((genreId) => ({ setId, genreId })))
    .onConflictDoNothing();

  return genreIds.length;
}
