import { createClient } from "@/lib/supabase/server";
import { normalizeSet } from "./sets";

export async function getSavedSets(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_sets")
    .select(`
      created_at,
      sets(
        id, title, slug, performed_at, duration_seconds, stage,
        set_artists(position, artists(id, name, slug)),
        set_genres(genres(id, name, slug)),
        events(id, name, slug, festivals(id, name, slug)),
        sources(id, platform, url, source_type, media_type, quality, is_active)
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data || [])
    .filter((item) => item.sets !== null)
    .map((item) => normalizeSet(item.sets!));
}

export async function getFollowedArtists(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("target_id, created_at")
    .eq("user_id", userId)
    .eq("target_type", "artist")
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return [];

  const artistIds = data.map((f) => f.target_id);
  const { data: artists } = await supabase
    .from("artists")
    .select(`
      id, name, slug, image_url,
      artist_genres(genres(id, name, slug))
    `)
    .in("id", artistIds);

  return (artists || []).map((a) => ({
    ...a,
    genres: (a.artist_genres || []).map(
      (ag) => ag.genres
    ).filter((g): g is NonNullable<typeof g> => g !== null),
  }));
}

export async function getFollowedFestivals(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("target_id, created_at")
    .eq("user_id", userId)
    .eq("target_type", "festival")
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return [];

  const festivalIds = data.map((f) => f.target_id);
  const { data: festivals } = await supabase
    .from("festivals")
    .select("id, name, slug, image_url")
    .in("id", festivalIds);

  return festivals || [];
}

export async function getFollowedGenres(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("target_id, created_at")
    .eq("user_id", userId)
    .eq("target_type", "genre")
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return [];

  const genreIds = data.map((f) => f.target_id);
  const { data: genres } = await supabase
    .from("genres")
    .select("id, name, slug")
    .in("id", genreIds);

  return genres || [];
}

export async function getCollections(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("collections")
    .select(`
      id, name, created_at,
      collection_sets(set_id)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data || []).map((c) => ({
    ...c,
    set_count: c.collection_sets?.length || 0,
  }));
}

export async function getCollectionById(collectionId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("collections")
    .select(`
      id, name, created_at,
      collection_sets(
        sets(
          id, title, slug, performed_at, duration_seconds, stage,
          set_artists(position, artists(id, name, slug)),
          set_genres(genres(id, name, slug)),
          events(id, name, slug, festivals(id, name, slug)),
          sources(id, platform, url, source_type, media_type, quality, is_active)
        )
      )
    `)
    .eq("id", collectionId)
    .eq("user_id", userId)
    .single();

  if (!data) return null;

  return {
    ...data,
    sets: (data.collection_sets || [])
      .filter((cs) => cs.sets !== null)
      .map((cs) => normalizeSet(cs.sets!)),
  };
}

export async function getCollectionsWithSetStatus(userId: string, setId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("collections")
    .select("id, name, collection_sets!left(set_id)")
    .eq("user_id", userId)
    .eq("collection_sets.set_id", setId)
    .order("name");

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    containsSet: (c.collection_sets?.length ?? 0) > 0,
  }));
}

export async function isSetSaved(userId: string, setId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("saved_sets")
    .select("set_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("set_id", setId);

  return (count || 0) > 0;
}

export async function getUserSubmissions(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("submissions")
    .select(
      "id, url, artist_name, title, status, rejection_reason, matched_set_id, created_at, sets!matched_set_id(slug, title)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((s) => ({
    ...s,
    matchedSet: s.sets ?? null,
  }));
}

export async function isFollowing(
  userId: string,
  targetType: "artist" | "festival" | "genre",
  targetId: string
) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("follows")
    .select("target_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  return (count || 0) > 0;
}
