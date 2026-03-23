import { createClient } from "@/lib/supabase/server";

export async function getArtistBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artists")
    .select(`
      id, name, slug, aliases, image_url, bio, socials,
      artist_genres(genres(id, name, slug))
    `)
    .eq("slug", slug)
    .single();

  if (!data) return null;

  return {
    ...data,
    genres: (data.artist_genres || []).map(
      (ag) => ag.genres
    ).filter((g): g is NonNullable<typeof g> => g !== null),
  };
}

export async function getArtistSetCount(artistId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("set_artists")
    .select("set_id", { count: "exact", head: true })
    .eq("artist_id", artistId);

  return count || 0;
}
