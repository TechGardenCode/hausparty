import { createClient } from "@/lib/supabase/server";
import { getYouTubeThumbnail } from "@/lib/utils";

const SET_SELECT = `
  id, title, slug, performed_at, duration_seconds, stage,
  set_artists(position, artists(id, name, slug)),
  set_genres(genres(id, name, slug)),
  events(id, name, slug, festivals(id, name, slug)),
  sources(id, platform, url, source_type, media_type, quality, is_active)
` as const;

export async function getTrendingSets(limit = 10) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sets")
    .select(SET_SELECT)
    .order("performed_at", { ascending: false })
    .limit(limit);

  return (data || []).map(normalizeSet);
}

export async function getNewSets(limit = 10) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sets")
    .select(SET_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []).map(normalizeSet);
}

export async function getSetBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sets")
    .select(`
      id, title, slug, performed_at, duration_seconds, stage,
      set_artists(position, artists(id, name, slug)),
      set_genres(genres(id, name, slug)),
      events(id, name, slug, date_start, location, stages, festivals(id, name, slug)),
      sources(id, platform, url, source_type, media_type, quality, embed_supported, is_active),
      tracklist_entries(id, position, title, timestamp_seconds)
    `)
    .eq("slug", slug)
    .single();

  if (!data) return null;
  return normalizeSet(data);
}

export async function getSetsByArtist(artistId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sets")
    .select(`
      id, title, slug, performed_at, duration_seconds, stage,
      set_artists!inner(position, artists(id, name, slug)),
      set_genres(genres(id, name, slug)),
      events(id, name, slug, festivals(id, name, slug)),
      sources(id, platform, url, source_type, media_type, quality, is_active)
    `)
    .eq("set_artists.artist_id", artistId)
    .order("performed_at", { ascending: false });

  return (data || []).map(normalizeSet);
}

export async function getSetsByEvent(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sets")
    .select(SET_SELECT)
    .eq("event_id", eventId)
    .order("performed_at", { ascending: true });

  return (data || []).map(normalizeSet);
}

export async function getSetsByGenre(genreId: string, page = 1, perPage = 20) {
  const supabase = await createClient();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, count } = await supabase
    .from("sets")
    .select(`
      id, title, slug, performed_at, duration_seconds, stage,
      set_artists(position, artists(id, name, slug)),
      set_genres!inner(genres(id, name, slug)),
      events(id, name, slug, festivals(id, name, slug)),
      sources(id, platform, url, source_type, media_type, quality, is_active)
    `, { count: "exact" })
    .eq("set_genres.genre_id", genreId)
    .order("performed_at", { ascending: false })
    .range(from, to);

  return {
    sets: (data || []).map(normalizeSet),
    total: count || 0,
    page,
    perPage,
  };
}

interface SetArtistRow {
  position: number;
  artists: { id: string; name: string; slug: string } | null;
}

interface SetGenreRow {
  genres: { id: string; name: string; slug: string } | null;
}

interface TracklistRow {
  id: string;
  position: number;
  title: string;
  timestamp_seconds: number | null;
}

interface SetRow {
  id: string;
  title: string;
  slug: string;
  performed_at: string | null;
  duration_seconds: number | null;
  stage: string | null;
  set_artists: SetArtistRow[];
  set_genres: SetGenreRow[];
  events: {
    id: string;
    name: string;
    slug: string;
    festivals: { id: string; name: string; slug: string } | null;
    date_start?: string | null;
    location?: string | null;
    stages?: string[] | null;
  } | null;
  sources: {
    id: string;
    platform: "youtube" | "soundcloud";
    source_type: "official" | "artist" | "fan";
    media_type?: "video" | "audio";
    quality?: string | null;
    is_active?: boolean;
    url?: string;
    embed_supported?: boolean;
  }[];
  tracklist_entries?: TracklistRow[];
}

export function normalizeSet(row: SetRow) {
  const artists = (row.set_artists || [])
    .sort((a, b) => a.position - b.position)
    .map((sa) => sa.artists)
    .filter((a): a is NonNullable<typeof a> => a !== null);

  const genres = (row.set_genres || [])
    .map((sg) => sg.genres)
    .filter((g): g is NonNullable<typeof g> => g !== null);

  const sources = row.sources || [];
  const youtubeSource = sources.find((s) => s.platform === "youtube" && s.url);
  const thumbnailUrl = getYouTubeThumbnail(youtubeSource?.url ?? null);

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    performed_at: row.performed_at,
    duration_seconds: row.duration_seconds,
    stage: row.stage,
    artists,
    genres,
    event: row.events || null,
    festival: row.events?.festivals || null,
    sources,
    thumbnailUrl,
    tracklist: row.tracklist_entries
      ? [...row.tracklist_entries].sort((a, b) => a.position - b.position)
      : undefined,
  };
}
