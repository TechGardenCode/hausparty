import { createClient } from "@/lib/supabase/server";

export async function getUserSettings(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("display_name, avatar_url, autoplay")
    .eq("user_id", userId)
    .single();

  return data ?? { display_name: null, avatar_url: null, autoplay: false };
}
