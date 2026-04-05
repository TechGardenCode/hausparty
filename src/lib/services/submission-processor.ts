import { db } from "@/lib/db";
import { submissions, sources, sets, setArtists } from "@/lib/db/schema";
import { eq, inArray, asc, sql } from "drizzle-orm";
import { slugify } from "@/lib/utils";
import { findOrCreateArtist } from "@/lib/services/artist-matching";
import { normalizeSourceUrl } from "@/lib/services/url-normalization";
import { fetchYouTubeMetadata } from "./youtube";
import { fetchSoundCloudMetadata } from "./soundcloud";
import type { OEmbedMetadata } from "./youtube";
import type { Platform, MediaType, SourceType } from "@/lib/db/types";

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

export function parseTitle(title: string): { artist: string; setTitle: string } {
  const dashMatch = title.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    return { artist: dashMatch[1].trim(), setTitle: dashMatch[2].trim() };
  }
  const pipeMatch = title.match(/^(.+?)\s*\|\s*(.+)$/);
  if (pipeMatch) {
    return { artist: pipeMatch[1].trim(), setTitle: pipeMatch[2].trim() };
  }
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

async function rejectSubmission(submissionId: string, reason: string) {
  await db
    .update(submissions)
    .set({
      status: "rejected",
      rejectionReason: reason,
      processedAt: new Date(),
    })
    .where(eq(submissions.id, submissionId));
}

export async function processSubmission(
  submissionId: string
): Promise<ProcessResult> {
  // 1. Fetch submission
  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);

  if (!submission) {
    return { submissionId, status: "rejected", reason: "Submission not found" };
  }

  // 2. Detect platform
  const platform = detectPlatform(submission.url);
  if (!platform) {
    await rejectSubmission(submissionId, "Unsupported platform");
    return { submissionId, status: "rejected", reason: "Unsupported platform" };
  }

  // 3. Fetch metadata
  const metadata = await fetchMetadata(submission.url, platform);
  if (!metadata) {
    await rejectSubmission(submissionId, "Could not fetch metadata — URL may be invalid or unreachable");
    return { submissionId, status: "rejected", reason: "Metadata fetch failed" };
  }

  // 4. Dedup check
  const normalizedUrl = normalizeSourceUrl(submission.url);
  const [existingSource] = await db
    .select({ id: sources.id, setId: sources.setId })
    .from(sources)
    .where(inArray(sources.url, [normalizedUrl, submission.url]))
    .limit(1);

  if (existingSource) {
    await db
      .update(submissions)
      .set({
        status: "rejected",
        rejectionReason: "Duplicate — this URL already exists in the catalog",
        matchedSetId: existingSource.setId,
        processedAt: new Date(),
      })
      .where(eq(submissions.id, submissionId));
    return {
      submissionId,
      status: "duplicate",
      setId: existingSource.setId,
      reason: "Duplicate URL",
    };
  }

  // 5. Parse title
  const parsed = parseTitle(metadata.title);
  const artistName = submission.artistName || parsed.artist || metadata.author;
  const setTitle = parsed.setTitle || metadata.title;

  // 6. Look up or create artist
  let artistId: string;
  try {
    const artistResult = await findOrCreateArtist(artistName);
    artistId = artistResult.artistId;
  } catch {
    await rejectSubmission(submissionId, "Failed to create artist record");
    return { submissionId, status: "rejected", reason: "Artist creation failed" };
  }

  // 7. Create set
  const setSlug = slugify(`${artistName}-${setTitle}`);
  let setId: string;
  try {
    const [newSet] = await db
      .insert(sets)
      .values({ title: setTitle, slug: setSlug })
      .returning({ id: sets.id });
    setId = newSet.id;
  } catch {
    const fallbackSlug = `${setSlug}-${Date.now().toString(36)}`;
    try {
      const [retrySet] = await db
        .insert(sets)
        .values({ title: setTitle, slug: fallbackSlug })
        .returning({ id: sets.id });
      setId = retrySet.id;
    } catch {
      await rejectSubmission(submissionId, "Failed to create set record");
      return { submissionId, status: "rejected", reason: "Set creation failed" };
    }
  }

  return await finalizeSubmission(submissionId, setId, artistId, submission.url, platform);
}

async function finalizeSubmission(
  submissionId: string,
  setId: string,
  artistId: string,
  url: string,
  platform: Platform
): Promise<ProcessResult> {
  const mediaType: MediaType = platform === "youtube" ? "video" : "audio";
  const sourceType: SourceType = "fan";

  await db.insert(sources).values({
    setId,
    platform,
    url: normalizeSourceUrl(url),
    sourceType,
    mediaType,
  });

  await db.insert(setArtists).values({ setId, artistId, position: 0 });

  await db
    .update(submissions)
    .set({
      status: "approved",
      matchedSetId: setId,
      processedAt: new Date(),
    })
    .where(eq(submissions.id, submissionId));

  return { submissionId, status: "approved", setId };
}

export async function processPendingSubmissions(): Promise<{
  processed: number;
  results: ProcessResult[];
}> {
  const pending = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(eq(submissions.status, "pending"))
    .orderBy(asc(submissions.createdAt));

  if (pending.length === 0) {
    return { processed: 0, results: [] };
  }

  const results: ProcessResult[] = [];
  for (const sub of pending) {
    const result = await processSubmission(sub.id);
    results.push(result);
  }

  const createdSets = results.filter((r) => r.status === "approved" && r.setId);
  if (createdSets.length > 0) {
    await db.execute(sql`SELECT refresh_search_view()`);
  }

  return { processed: results.length, results };
}
