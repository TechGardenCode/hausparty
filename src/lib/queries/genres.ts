import { createClient } from "@/lib/supabase/server";

export async function getAllGenres() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("genres")
    .select("id, name, slug")
    .order("name");

  return data || [];
}

export async function getGenreBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("genres")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  return data;
}
