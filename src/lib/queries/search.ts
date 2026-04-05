import { db } from "@/lib/db";
import { sets, artists, festivals } from "@/lib/db/schema";
import { ilike, inArray, sql } from "drizzle-orm";
import { normalizeSet } from "./sets";

export async function searchSets(query: string, limit = 20) {
  // Step 1: Get ranked set IDs from materialized view via RPC
  const ranked = await db.execute<{ set_id: string }>(
    sql`SELECT set_id FROM search_sets(${query}, ${limit})`
  );

  if (!ranked || ranked.length === 0) return [];

  const setIds = ranked.map((r) => r.set_id);

  // Step 2: Fetch full set data with joins
  const data = await db.query.sets.findMany({
    where: inArray(sets.id, setIds),
    with: {
      setArtists: { with: { artist: true } },
      setGenres: { with: { genre: true } },
      event: { with: { festival: true } },
      sources: true,
    },
  });

  // Step 3: Re-order to match search ranking
  const normalized = data.map(normalizeSet);
  const idOrder = new Map(setIds.map((id, i) => [id, i]));
  normalized.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

  return normalized;
}

export async function searchArtists(query: string, limit = 20) {
  const data = await db.query.artists.findMany({
    where: ilike(artists.name, `%${query}%`),
    with: {
      artistGenres: { with: { genre: true } },
    },
    orderBy: [artists.name],
    limit,
  });

  return data.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    image_url: a.imageUrl,
    genres: (a.artistGenres || [])
      .map((ag) => ag.genre)
      .filter((g): g is NonNullable<typeof g> => g !== null),
  }));
}

export async function searchFestivals(query: string, limit = 20) {
  const data = await db.query.festivals.findMany({
    where: ilike(festivals.name, `%${query}%`),
    orderBy: [festivals.name],
    limit,
  });

  return data.map((f) => ({
    id: f.id,
    name: f.name,
    slug: f.slug,
    image_url: f.imageUrl,
  }));
}

export async function typeaheadSearch(query: string) {
  const [sets, artists, festivals] = await Promise.all([
    searchSets(query, 3),
    searchArtists(query, 3),
    searchFestivals(query, 3),
  ]);

  return { sets, artists, festivals };
}
