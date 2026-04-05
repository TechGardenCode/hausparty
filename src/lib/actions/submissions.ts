"use server";

import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function submitSet(formData: FormData) {
  const user = await getCurrentUser();
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

  try {
    await db.insert(submissions).values({
      userId: user.id,
      url,
      artistName: trimOrNull("artist_name"),
      title: trimOrNull("title"),
      eventName: trimOrNull("event_name"),
      genre: trimOrNull("genre"),
      stage: trimOrNull("stage"),
      performedDate: performedDateRaw,
      description: trimOrNull("description"),
    });
  } catch (err) {
    return { error: (err as Error).message };
  }

  return { success: true };
}
