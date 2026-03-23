import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { findOrCreateArtist } from "@/lib/services/artist-matching";
import { normalizeSourceUrl } from "@/lib/services/url-normalization";
import { fetchYouTubeMetadata } from "./youtube";
import { fetchSoundCloudMetadata } from "./soundcloud";
import type { OEmbedMetadata } from "./youtube";
import type { Platform, MediaType, SourceType } from "@/lib/types/database";

interface ProcessResult {
  submissionId: string;
  status: "approved" | "rejected" | "duplicate";
  setId?: string;
  reason?: string;
}

export function detectPlatform(url: string): Platform | null {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("soundcloud.com")) return "soundcloud";
  return null;
}

/**
 * Parse a title like "Artist - Set Title @ Event" or "Artist | Live at Event"
 * into artist name and set title components.
 */
export function parseTitle(title: string): { artist: string; setTitle: string } {
  // Try "Artist - Title" pattern first
  const dashMatch = title.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    return { artist: dashMatch[1].trim(), setTitle: dashMatch[2].trim() };
  }
  // Try "Artist | Title"
  const pipeMatch = title.match(/^(.+?)\s*\|\s*(.+)$/);
  if (pipeMatch) {
    return { artist: pipeMatch[1].trim(), setTitle: pipeMatch[2].trim() };
  }
  // Fallback: use full title as set title, author as artist
  return { artist: "", setTitle: title };
}

async function fetchMetadata(
  url: string,
  platform: Platform
): Promise<OEmbedMetadata | null> {
  if (platform === "youtube") return fetchYouTubeMetadata(url);
  if (platform === "soundcloud") return fetchSoundCloudMetadata(url);
  return null;
}

export async function processSubmission(
  submissionId: string
): Promise<ProcessResult> {
  const supabase = createAdminClient();

  // 1. Fetch submission
  const { data: submission, error: fetchError } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (fetchError || !submission) {
    return { submissionId, status: "rejected", reason: "Submission not found" };
  }

  // 2. Detect platform
  const platform = detectPlatform(submission.url);
  if (!platform) {
    await supabase
      .from("submissions")
      .update({
        status: "rejected",
        rejection_reason: "Unsupported platform",
        processed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);
    return { submissionId, status: "rejected", reason: "Unsupported platform" };
  }

  // 3. Fetch metadata
  const metadata = await fetchMetadata(submission.url, platform);
  if (!metadata) {
    await supabase
      .from("submissions")
      .update({
        status: "rejected",
        rejection_reason: "Could not fetch metadata — URL may be invalid or unreachable",
        processed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);
    return {
      submissionId,
      status: "rejected",
      reason: "Metadata fetch failed",
    };
  }

  // 4. Dedup check: look for existing source with same URL (normalized or raw)
  const normalizedUrl = normalizeSourceUrl(submission.url);
  const { data: existingSource } = await supabase
    .from("sources")
    .select("id, set_id")
    .in("url", [normalizedUrl, submission.url])
    .limit(1)
    .maybeSingle();

  if (existingSource) {
    await supabase
      .from("submissions")
      .update({
        status: "rejected",
        rejection_reason: "Duplicate — this URL already exists in the catalog",
        matched_set_id: existingSource.set_id,
        processed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);
    return {
      submissionId,
      status: "duplicate",
      setId: existingSource.set_id,
      reason: "Duplicate URL",
    };
  }

  // 5. Parse title to extract artist / set name
  const parsed = parseTitle(metadata.title);
  const artistName =
    submission.artist_name || parsed.artist || metadata.author;
  const setTitle = parsed.setTitle || metadata.title;

  // 6. Look up or create artist (three-tier matching pipeline)
  let artistId: string;
  try {
    const artistResult = await findOrCreateArtist(supabase, artistName);
    artistId = artistResult.artistId;
  } catch {
    await supabase
      .from("submissions")
      .update({
        status: "rejected",
        rejection_reason: "Failed to create artist record",
        processed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);
    return {
      submissionId,
      status: "rejected",
      reason: "Artist creation failed",
    };
  }

  // 7. Create set
  const setSlug = slugify(`${artistName}-${setTitle}`);
  const { data: newSet, error: setError } = await supabase
    .from("sets")
    .insert({ title: setTitle, slug: setSlug })
    .select("id")
    .single();

  if (setError || !newSet) {
    // Slug collision — append a short random suffix
    const fallbackSlug = `${setSlug}-${Date.now().toString(36)}`;
    const { data: retrySet, error: retryError } = await supabase
      .from("sets")
      .insert({ title: setTitle, slug: fallbackSlug })
      .select("id")
      .single();

    if (retryError || !retrySet) {
      await supabase
        .from("submissions")
        .update({
          status: "rejected",
          rejection_reason: "Failed to create set record",
          processed_at: new Date().toISOString(),
        })
        .eq("id", submissionId);
      return {
        submissionId,
        status: "rejected",
        reason: "Set creation failed",
      };
    }
    // Use retry result
    return await finalizeSubmission(
      supabase,
      submissionId,
      retrySet.id,
      artistId,
      submission.url,
      platform
    );
  }

  return await finalizeSubmission(
    supabase,
    submissionId,
    newSet.id,
    artistId,
    submission.url,
    platform
  );
}

async function finalizeSubmission(
  supabase: ReturnType<typeof createAdminClient>,
  submissionId: string,
  setId: string,
  artistId: string,
  url: string,
  platform: Platform
): Promise<ProcessResult> {
  const mediaType: MediaType = platform === "youtube" ? "video" : "audio";
  const sourceType: SourceType = "fan";

  // Create source (store normalized URL for dedup consistency)
  await supabase.from("sources").insert({
    set_id: setId,
    platform,
    url: normalizeSourceUrl(url),
    source_type: sourceType,
    media_type: mediaType,
  });

  // Create set_artists join
  await supabase
    .from("set_artists")
    .insert({ set_id: setId, artist_id: artistId, position: 0 });

  // Update submission
  await supabase
    .from("submissions")
    .update({
      status: "approved",
      matched_set_id: setId,
      processed_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  return { submissionId, status: "approved", setId };
}

export async function processPendingSubmissions(): Promise<{
  processed: number;
  results: ProcessResult[];
}> {
  const supabase = createAdminClient();

  const { data: pending } = await supabase
    .from("submissions")
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (!pending || pending.length === 0) {
    return { processed: 0, results: [] };
  }

  const results: ProcessResult[] = [];
  for (const sub of pending) {
    const result = await processSubmission(sub.id);
    results.push(result);
  }

  // Refresh search index if any new sets were created
  const createdSets = results.filter((r) => r.status === "approved" && r.setId);
  if (createdSets.length > 0) {
    await supabase.rpc("refresh_search_view");
  }

  return { processed: results.length, results };
}
