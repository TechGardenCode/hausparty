import { createClient } from "@/lib/supabase/server";

export async function getAllFestivals() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("festivals")
    .select(`
      id, name, slug, description, image_url,
      festival_genres(genres(id, name, slug))
    `)
    .order("name");

  return (data || []).map((f) => ({
    ...f,
    genres: (f.festival_genres || []).map(
      (fg) => fg.genres
    ).filter((g): g is NonNullable<typeof g> => g !== null),
  }));
}

export async function getFestivalBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("festivals")
    .select(`
      id, name, slug, description, image_url,
      festival_genres(genres(id, name, slug))
    `)
    .eq("slug", slug)
    .single();

  if (!data) return null;

  return {
    ...data,
    genres: (data.festival_genres || []).map(
      (fg) => fg.genres
    ).filter((g): g is NonNullable<typeof g> => g !== null),
  };
}

export async function getFestivalEvents(festivalId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id, name, slug, date_start, date_end, location, stages")
    .eq("festival_id", festivalId)
    .order("date_start", { ascending: false });

  return data || [];
}

export async function getFestivalSetCount(festivalId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("sets")
    .select("id, events!inner(festival_id)", { count: "exact", head: true })
    .eq("events.festival_id", festivalId);

  return count || 0;
}
