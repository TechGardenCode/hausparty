"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-helpers";
import { assembleSetFromUrl } from "@/lib/services/discovery/assemble-set";
import { db } from "@/lib/db";
import { artists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Create a draft set from a pasted URL with pre-resolved metadata.
 * Called from the discovery queue UI when admin pastes a YouTube/SoundCloud URL.
 */
export async function createSetFromDiscovery(data: {
  url: string;
  artistId: string;
  eventId?: string;
  performedAt?: string;
}): Promise<{ setId: string; action: string; status: string }> {
  await requireAdmin();

  // Look up artist name for the assembler
  const [artist] = await db
    .select({ name: artists.name })
    .from(artists)
    .where(eq(artists.id, data.artistId))
    .limit(1);

  if (!artist) {
    throw new Error("Artist not found");
  }

  const result = await assembleSetFromUrl({
    url: data.url,
    artistId: data.artistId,
    artistName: artist.name,
    eventId: data.eventId,
    performedAt: data.performedAt ? new Date(data.performedAt) : undefined,
  });

  revalidatePath("/admin/discovery");
  revalidatePath("/admin/sets");
  revalidatePath("/admin");

  return { setId: result.setId, action: result.action, status: result.status };
}
