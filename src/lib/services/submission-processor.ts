import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { findOrCreateArtist } from "@/lib/services/artist-matching";
import { normalizeSourceUrl } from "@/lib/services/url-normalization";
import { findOrLinkSet } from "@/lib/services/sets/find-or-link";
import { inferGenresForSet } from "@/lib/services/normalization/genre-inference";
import { evaluateAndRefreshIfPublished } from "@/lib/services/sets/completeness";
import { fetchYouTubeMetadata } from "./youtube";
import { fetchSoundCloudMetadata } from "./soundcloud";
import type { OEmbedMetadata } from "./youtube";
import type { Platform } from "@/lib/db/types";

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
  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);

  if (!submission) {
    return { submissionId, status: "rejected", reason: "Submission not found" };
  }

  const platform = detectPlatform(submission.url);
  if (!platform) {
    await rejectSubmission(submissionId, "Unsupported platform");
    return { submissionId, status: "rejected", reason: "Unsupported platform" };
  }

  const metadata = await fetchMetadata(submission.url, platform);
  if (!metadata) {
    await rejectSubmission(
      submissionId,
      "Could not fetch metadata — URL may be invalid or unreachable"
    );
    return { submissionId, status: "rejected", reason: "Metadata fetch failed" };
  }

  const parsed = parseTitle(metadata.title);
  const artistName = submission.artistName || parsed.artist || metadata.author;
  const setTitle = parsed.setTitle || metadata.title;

  let artistId: string;
  try {
    const artistResult = await findOrCreateArtist(artistName);
    artistId = artistResult.artistId;
  } catch {
    await rejectSubmission(submissionId, "Failed to create artist record");
    return { submissionId, status: "rejected", reason: "Artist creation failed" };
  }

  const normalizedUrl = normalizeSourceUrl(submission.url);
  const performedAt = submission.performedDate
    ? new Date(submission.performedDate)
    : undefined;

  const link = await findOrLinkSet({
    primaryArtistId: artistId,
    performedAt,
    sourceUrl: normalizedUrl,
    platform,
    sourceType: "fan",
    titleHint: setTitle,
  });

  if (link.action === "added_source") {
    // URL was already in the catalog — no new source inserted. Treat as duplicate.
    await db
      .update(submissions)
      .set({
        status: "rejected",
        rejectionReason: "Duplicate — this URL already exists in the catalog",
        matchedSetId: link.setId,
        processedAt: new Date(),
      })
      .where(eq(submissions.id, submissionId));
    return {
      submissionId,
      status: "duplicate",
      setId: link.setId,
      reason: "Duplicate URL",
    };
  }

  // linked_existing or created — a new source was recorded.
  await inferGenresForSet(link.setId, [artistId]);
  await evaluateAndRefreshIfPublished(link.setId);

  await db
    .update(submissions)
    .set({
      status: "approved",
      matchedSetId: link.setId,
      processedAt: new Date(),
    })
    .where(eq(submissions.id, submissionId));

  return { submissionId, status: "approved", setId: link.setId };
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

  const landed = results.filter(
    (r) => r.status === "approved" && r.setId
  );
  if (landed.length > 0) {
    await db.execute(sql`SELECT refresh_search_view()`);
  }

  return { processed: results.length, results };
}
