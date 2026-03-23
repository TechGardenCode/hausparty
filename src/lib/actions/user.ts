"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateSettings(
  _prev: { success?: boolean; error?: string } | null,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const display_name = (formData.get("display_name") as string)?.trim() || null;
  const avatar_url = (formData.get("avatar_url") as string)?.trim() || null;
  const autoplay = formData.get("autoplay") === "on";

  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    display_name,
    avatar_url,
    autoplay,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/sets");
  return { success: true };
}
