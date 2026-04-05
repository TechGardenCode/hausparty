"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function updateSettings(
  _prev: { success?: boolean; error?: string } | null,
  formData: FormData
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const displayName = (formData.get("display_name") as string)?.trim() || null;
  const avatarUrl = (formData.get("avatar_url") as string)?.trim() || null;
  const autoplay = formData.get("autoplay") === "on";

  try {
    await db
      .insert(userSettings)
      .values({
        userId: user.id,
        displayName,
        avatarUrl,
        autoplay,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          displayName,
          avatarUrl,
          autoplay,
          updatedAt: new Date(),
        },
      });
  } catch (err) {
    return { error: (err as Error).message };
  }

  revalidatePath("/settings");
  revalidatePath("/sets");
  return { success: true };
}
