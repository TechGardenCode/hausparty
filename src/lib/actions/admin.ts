"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  submissions,
  sets,
  setArtists,
  setGenres,
  events,
  genres,
  artists,
} from "@/lib/db/schema";
import { processSubmission } from "@/lib/services/submission-processor";
import { slugify } from "@/lib/utils";
import {
  searchArtists as _searchArtists,
  searchEvents as _searchEvents,
  searchFestivals as _searchFestivals,
  getGenreSuggestionsForArtists as _getGenreSuggestionsForArtists,
} from "@/lib/queries/admin";

export async function approveSubmission(submissionId: string) {
  await requireAdmin();
  const result = await processSubmission(submissionId);

  if (result.status === "approved") {
    // Refresh search index after new set creation
    await db.execute(sql`SELECT refresh_search_view()`);
  }

  revalidatePath("/admin/submissions");
  return result;
}

export async function rejectSubmission(submissionId: string, reason: string) {
  await requireAdmin();

  await db
    .update(submissions)
    .set({
      status: "rejected",
      rejectionReason: reason,
      processedAt: new Date(),
    })
    .where(eq(submissions.id, submissionId));

  revalidatePath("/admin/submissions");
}

export async function reprocessSubmission(submissionId: string) {
  await requireAdmin();

  // Reset to pending
  await db
    .update(submissions)
    .set({
      status: "pending",
      rejectionReason: null,
      processedAt: null,
      matchedSetId: null,
    })
    .where(eq(submissions.id, submissionId));

  // Re-process
  const result = await processSubmission(submissionId);

  if (result.status === "approved") {
    await db.execute(sql`SELECT refresh_search_view()`);
  }

  revalidatePath("/admin/submissions");
  return result;
}

// --- Set Editor Actions ---

export async function updateSet(
  setId: string,
  data: {
    title?: string;
    slug?: string;
    performed_at?: string | null;
    duration_seconds?: number | null;
    stage?: string | null;
    event_id?: string | null;
  }
) {
  await requireAdmin();

  // Map snake_case input keys to camelCase schema columns
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.performed_at !== undefined) updateData.performedAt = data.performed_at;
  if (data.duration_seconds !== undefined) updateData.durationSeconds = data.duration_seconds;
  if (data.stage !== undefined) updateData.stage = data.stage;
  if (data.event_id !== undefined) updateData.eventId = data.event_id;

  await db.update(sets).set(updateData).where(eq(sets.id, setId));

  revalidatePath("/admin/sets");
  revalidatePath(`/admin/sets/${setId}/edit`);
}

export async function updateSetArtists(
  setId: string,
  artistList: { id: string; position: number }[]
) {
  await requireAdmin();

  // Delete existing associations
  await db.delete(setArtists).where(eq(setArtists.setId, setId));

  // Insert new ones
  if (artistList.length > 0) {
    await db.insert(setArtists).values(
      artistList.map((a) => ({
        setId,
        artistId: a.id,
        position: a.position,
      }))
    );
  }

  revalidatePath("/admin/sets");
  revalidatePath(`/admin/sets/${setId}/edit`);
}

export async function updateSetGenres(setId: string, genreIds: string[]) {
  await requireAdmin();

  // Delete existing associations
  await db.delete(setGenres).where(eq(setGenres.setId, setId));

  // Insert new ones
  if (genreIds.length > 0) {
    await db.insert(setGenres).values(
      genreIds.map((genreId) => ({
        setId,
        genreId,
      }))
    );
  }

  revalidatePath("/admin/sets");
  revalidatePath(`/admin/sets/${setId}/edit`);
}

export async function createEvent(data: {
  name: string;
  festival_id?: string | null;
  date_start?: string | null;
}) {
  await requireAdmin();

  const slug = slugify(data.name);
  const [newEvent] = await db
    .insert(events)
    .values({
      name: data.name,
      slug,
      festivalId: data.festival_id ?? null,
      dateStart: data.date_start ?? null,
    })
    .returning({
      id: events.id,
      name: events.name,
      slug: events.slug,
    });

  return newEvent;
}

export async function createGenre(name: string) {
  await requireAdmin();

  const slug = slugify(name);
  const [newGenre] = await db
    .insert(genres)
    .values({ name, slug })
    .returning({
      id: genres.id,
      name: genres.name,
      slug: genres.slug,
    });

  return newGenre;
}

export async function createArtist(name: string) {
  await requireAdmin();

  const slug = slugify(name);
  const [newArtist] = await db
    .insert(artists)
    .values({ name, slug })
    .returning({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
    });

  return newArtist;
}

export async function bulkAssignGenre(setIds: string[], genreId: string) {
  await requireAdmin();

  const rows = setIds.map((setId) => ({ setId, genreId }));

  await db
    .insert(setGenres)
    .values(rows)
    .onConflictDoNothing();

  revalidatePath("/admin/sets");
}

export async function mergeArtists(canonicalId: string, duplicateId: string) {
  await requireAdmin();

  await db.execute(
    sql`SELECT merge_artists(${canonicalId}::uuid, ${duplicateId}::uuid)`
  );

  // Refresh search view since set-artist associations changed
  await db.execute(sql`SELECT refresh_search_view()`);

  revalidatePath("/admin/artists");
  revalidatePath("/admin/artists/duplicates");
}

export async function findDuplicateArtists(threshold?: number) {
  await requireAdmin();

  const result = await db.execute(
    sql`SELECT * FROM find_similar_artists(${threshold ?? 0.7})`
  );

  return [...result] as { artist1_id: string; artist1_name: string; artist2_id: string; artist2_name: string; sim: number }[];
}

export async function refreshSearchIndex() {
  await requireAdmin();

  await db.execute(sql`SELECT refresh_search_view()`);

  revalidatePath("/admin");
}

// --- Server action wrappers for query functions called from client components ---

export async function adminSearchArtists(query: string) {
  return _searchArtists(query);
}

export async function adminSearchEvents(query: string) {
  return _searchEvents(query);
}

export async function adminSearchFestivals(query: string) {
  return _searchFestivals(query);
}

export async function adminGetGenreSuggestions(artistIds: string[]) {
  return _getGenreSuggestionsForArtists(artistIds);
}
