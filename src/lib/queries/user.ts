import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getUserSettings(userId: string) {
  const data = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });

  if (!data) {
    return { display_name: null, avatar_url: null, autoplay: false };
  }

  return {
    display_name: data.displayName,
    avatar_url: data.avatarUrl,
    autoplay: data.autoplay,
  };
}
