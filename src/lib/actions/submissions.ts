"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitSet(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const url = (formData.get("url") as string)?.trim();
  if (!url) return { error: "URL is required" };

  // Basic URL validation
  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isSoundCloud = url.includes("soundcloud.com");
  if (!isYouTube && !isSoundCloud) {
    return { error: "URL must be from YouTube or SoundCloud" };
  }

  const trimOrNull = (key: string) =>
    (formData.get(key) as string)?.trim() || null;

  const performedDateRaw = trimOrNull("performed_date");

  const { error } = await supabase.from("submissions").insert({
    user_id: user.id,
    url,
    artist_name: trimOrNull("artist_name"),
    title: trimOrNull("title"),
    event_name: trimOrNull("event_name"),
    genre: trimOrNull("genre"),
    stage: trimOrNull("stage"),
    performed_date: performedDateRaw,
    description: trimOrNull("description"),
  });

  if (error) return { error: error.message };

  return { success: true };
}
