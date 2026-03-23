import { createClient } from "@/lib/supabase/server";
import { normalizeSet } from "./sets";

export async function searchSets(query: string, limit = 20) {
  const supabase = await createClient();

  // Step 1: Get ranked set IDs from materialized view via RPC
  const { data: ranked } = await supabase.rpc("search_sets", {
    search_query: query,
    result_limit: limit,
  });

  if (!ranked || ranked.length === 0) return [];

  const setIds = ranked.map((r) => r.set_id);

  // Step 2: Fetch full set data with joins
  const { data } = await supabase
    .from("sets")
    .select(`
      id, title, slug, performed_at, duration_seconds, stage,
      set_artists(position, artists(id, name, slug)),
      set_genres(genres(id, name, slug)),
      events(id, name, slug, festivals(id, name, slug)),
      sources(id, platform, url, source_type, media_type, quality, is_active)
    `)
    .in("id", setIds);

  // Step 3: Re-order to match search ranking
  const normalized = (data || []).map(normalizeSet);
  const idOrder = new Map(setIds.map((id, i) => [id, i]));
  normalized.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

  return normalized;
}

export async function searchArtists(query: string, limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artists")
    .select(`
      id, name, slug, image_url,
      artist_genres(genres(id, name, slug))
    `)
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(limit);

  return (data || []).map((a) => ({
    ...a,
    genres: (a.artist_genres || []).map(
      (ag) => ag.genres
    ).filter((g): g is NonNullable<typeof g> => g !== null),
  }));
}

export async function searchFestivals(query: string, limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("festivals")
    .select("id, name, slug, image_url")
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(limit);

  return data || [];
}

export async function typeaheadSearch(query: string) {
  const [sets, artists, festivals] = await Promise.all([
    searchSets(query, 3),
    searchArtists(query, 3),
    searchFestivals(query, 3),
  ]);

  return { sets, artists, festivals };
}
