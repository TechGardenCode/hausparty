"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/queries/auth";
import { createAdminClient } from "@/lib/supabase/admin";
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
    const supabase = createAdminClient();
    await supabase.rpc("refresh_search_view");
  }

  revalidatePath("/admin/submissions");
  return result;
}

export async function rejectSubmission(submissionId: string, reason: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  await supabase
    .from("submissions")
    .update({
      status: "rejected" as const,
      rejection_reason: reason,
      processed_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  revalidatePath("/admin/submissions");
}

export async function reprocessSubmission(submissionId: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  // Reset to pending
  await supabase
    .from("submissions")
    .update({
      status: "pending" as const,
      rejection_reason: null,
      processed_at: null,
      matched_set_id: null,
    })
    .eq("id", submissionId);

  // Re-process
  const result = await processSubmission(submissionId);

  if (result.status === "approved") {
    await supabase.rpc("refresh_search_view");
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
  const supabase = createAdminClient();

  const { error } = await supabase.from("sets").update(data).eq("id", setId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/sets");
  revalidatePath(`/admin/sets/${setId}/edit`);
}

export async function updateSetArtists(
  setId: string,
  artists: { id: string; position: number }[]
) {
  await requireAdmin();
  const supabase = createAdminClient();

  // Delete existing associations
  await supabase.from("set_artists").delete().eq("set_id", setId);

  // Insert new ones
  if (artists.length > 0) {
    const { error } = await supabase.from("set_artists").insert(
      artists.map((a) => ({
        set_id: setId,
        artist_id: a.id,
        position: a.position,
      }))
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/sets");
  revalidatePath(`/admin/sets/${setId}/edit`);
}

export async function updateSetGenres(setId: string, genreIds: string[]) {
  await requireAdmin();
  const supabase = createAdminClient();

  // Delete existing associations
  await supabase.from("set_genres").delete().eq("set_id", setId);

  // Insert new ones
  if (genreIds.length > 0) {
    const { error } = await supabase.from("set_genres").insert(
      genreIds.map((genreId) => ({
        set_id: setId,
        genre_id: genreId,
      }))
    );
    if (error) throw new Error(error.message);
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
  const supabase = createAdminClient();

  const slug = slugify(data.name);
  const { data: newEvent, error } = await supabase
    .from("events")
    .insert({
      name: data.name,
      slug,
      festival_id: data.festival_id ?? null,
      date_start: data.date_start ?? null,
    })
    .select("id, name, slug")
    .single();

  if (error) throw new Error(error.message);
  return newEvent;
}

export async function createGenre(name: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const slug = slugify(name);
  const { data: newGenre, error } = await supabase
    .from("genres")
    .insert({ name, slug })
    .select("id, name, slug")
    .single();

  if (error) throw new Error(error.message);
  return newGenre;
}

export async function createArtist(name: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const slug = slugify(name);
  const { data: newArtist, error } = await supabase
    .from("artists")
    .insert({ name, slug })
    .select("id, name, slug")
    .single();

  if (error) throw new Error(error.message);
  return newArtist;
}

export async function bulkAssignGenre(setIds: string[], genreId: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  // Insert set_genres rows, ignoring conflicts (upsert with onConflict)
  const rows = setIds.map((setId) => ({ set_id: setId, genre_id: genreId }));

  const { error } = await supabase
    .from("set_genres")
    .upsert(rows, { onConflict: "set_id,genre_id", ignoreDuplicates: true });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/sets");
}

export async function mergeArtists(canonicalId: string, duplicateId: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.rpc("merge_artists", {
    canonical_id: canonicalId,
    duplicate_id: duplicateId,
  });

  if (error) throw new Error(`Merge failed: ${error.message}`);

  // Refresh search view since set-artist associations changed
  await supabase.rpc("refresh_search_view");

  revalidatePath("/admin/artists");
  revalidatePath("/admin/artists/duplicates");
}

export async function findDuplicateArtists(threshold?: number) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("find_similar_artists", {
    similarity_threshold: threshold ?? 0.7,
  });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function refreshSearchIndex() {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase.rpc("refresh_search_view");
  if (error) throw new Error(error.message);

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
