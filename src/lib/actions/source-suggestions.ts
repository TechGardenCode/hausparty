"use server";

import { db } from "@/lib/db";
import { sourceSuggestions, sources } from "@/lib/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-helpers";
import { detectPlatform } from "@/lib/services/submission-processor";
import { normalizeSourceUrl } from "@/lib/services/url-normalization";
import type { SourceType, MediaType } from "@/lib/db/types";

interface SubmitSourceSuggestionInput {
  setId: string;
  url: string;
  sourceType: SourceType;
  mediaType: MediaType;
  note?: string;
}

export async function submitSourceSuggestion(
  data: SubmitSourceSuggestionInput
): Promise<{ success: true } | { error: string }> {
  const userId = await requireAuth();

  const url = data.url.trim();
  if (!url) return { error: "URL is required" };

  const platform = detectPlatform(url);
  if (!platform) {
    return { error: "URL must be from YouTube or SoundCloud" };
  }

  const normalizedUrl = normalizeSourceUrl(url);

  // Check for duplicate: same normalized URL already exists as a source on this set
  const [existing] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(and(eq(sources.setId, data.setId), eq(sources.url, normalizedUrl)))
    .limit(1);

  if (existing) {
    return { error: "This source already exists on this set" };
  }

  // Also check pending suggestions to prevent duplicate pending entries
  const [pendingSuggestion] = await db
    .select({ id: sourceSuggestions.id })
    .from(sourceSuggestions)
    .where(
      and(
        eq(sourceSuggestions.setId, data.setId),
        eq(sourceSuggestions.url, normalizedUrl),
        eq(sourceSuggestions.status, "pending")
      )
    )
    .limit(1);

  if (pendingSuggestion) {
    return { error: "This source has already been suggested and is awaiting review" };
  }

  // Rate limit: max 10 suggestions per user per day
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sourceSuggestions)
    .where(
      and(
        eq(sourceSuggestions.userId, userId),
        gte(sourceSuggestions.createdAt, dayAgo)
      )
    );

  if (count >= 10) {
    return { error: "Daily suggestion limit reached (10/day). Try again tomorrow." };
  }

  await db.insert(sourceSuggestions).values({
    userId,
    setId: data.setId,
    url: normalizedUrl,
    platform,
    sourceType: data.sourceType,
    mediaType: data.mediaType,
    note: data.note?.trim() || null,
  });

  return { success: true };
}
