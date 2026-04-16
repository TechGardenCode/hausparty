"use server";

import { revalidatePath } from "next/cache";
import { eq, sql, and, ne, not, ilike } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  sets,
  setArtists,
  savedSets,
  collectionSets,
} from "@/lib/db/schema";

export interface MergePreview {
  from: SetSummary;
  into: SetSummary;
  willMove: {
    sources: number;
    sourceUrlCollisions: number;
    artists: number;
    saves: number;
    collectionMemberships: number;
    tracklistDropped: number;
  };
  blockers: string[];
}

interface SetSummary {
  id: string;
  title: string;
  slug: string;
  status: string;
  sources: number;
  artists: number;
  saves: number;
  collectionMemberships: number;
  tracklist: number;
}

export interface MergeResult {
  setId: string;
  fromSlug: string;
  moved: {
    sources: number;
    artists: number;
    saves: number;
    collectionMemberships: number;
  };
  droppedSourceUrlCollisions: number;
  droppedTracklistEntries: number;
}

export async function previewMerge(
  fromSetId: string,
  intoSetId: string
): Promise<MergePreview> {
  await requireAdmin();
  return loadPreview(fromSetId, intoSetId);
}

export interface MergeTargetOption {
  id: string;
  title: string;
  slug: string;
  status: string;
  performedAt: Date | null;
  artistNames: string;
}

/**
 * Title ilike search across ALL non-merged sets (drafts + published), scoped
 * to an optional artist filter. Used by the merge UI's target picker —
 * cannot reuse public searchSets because the materialized view excludes drafts.
 */
export async function searchSetsForMergeTarget(
  query: string,
  excludeSetId: string,
  limit = 20
): Promise<MergeTargetOption[]> {
  await requireAdmin();
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const rows = await db
    .select({
      id: sets.id,
      title: sets.title,
      slug: sets.slug,
      status: sets.status,
      performedAt: sets.performedAt,
      artistNames: sql<string>`
        COALESCE(
          (SELECT string_agg(a.name, ', ' ORDER BY sa.position)
           FROM set_artists sa
           JOIN artists a ON a.id = sa.artist_id
           WHERE sa.set_id = ${sets.id}),
          ''
        )
      `,
    })
    .from(sets)
    .where(
      and(
        ne(sets.id, excludeSetId),
        not(eq(sets.status, "merged")),
        ilike(sets.title, `%${trimmed}%`)
      )
    )
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    status: r.status,
    performedAt: r.performedAt,
    artistNames: r.artistNames,
  }));
}

export async function mergeSet(
  fromSetId: string,
  intoSetId: string
): Promise<MergeResult> {
  await requireAdmin();

  const preview = await loadPreview(fromSetId, intoSetId);
  if (preview.blockers.length > 0) {
    throw new Error(`Merge blocked: ${preview.blockers.join("; ")}`);
  }

  const result = await db.transaction(async (tx) => {
    // URL collision cleanup — drop from-side sources whose URL already exists
    // on the canonical. Lossless: the canonical already has that URL.
    const dropResult = await tx.execute<{ count: string }>(sql`
      WITH deleted AS (
        DELETE FROM sources
        WHERE set_id = ${fromSetId}::uuid
          AND url IN (SELECT url FROM sources WHERE set_id = ${intoSetId}::uuid)
        RETURNING id
      )
      SELECT COUNT(*)::text AS count FROM deleted
    `);
    const droppedUrlCollisions = Number(dropResult[0]?.count ?? 0);

    // Transfer remaining sources
    const movedSources = await tx.execute<{ count: string }>(sql`
      WITH moved AS (
        UPDATE sources SET set_id = ${intoSetId}::uuid
        WHERE set_id = ${fromSetId}::uuid
        RETURNING id
      )
      SELECT COUNT(*)::text AS count FROM moved
    `);
    const sourcesMoved = Number(movedSources[0]?.count ?? 0);

    // set_artists — union the two lineups, skipping duplicates
    const beforeArtists = await tx
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(setArtists)
      .where(eq(setArtists.setId, intoSetId));
    await tx.execute(sql`
      INSERT INTO set_artists (set_id, artist_id, position)
      SELECT ${intoSetId}::uuid, artist_id,
             position + (SELECT COALESCE(MAX(position), -1) + 1 FROM set_artists WHERE set_id = ${intoSetId}::uuid)
      FROM set_artists
      WHERE set_id = ${fromSetId}::uuid
      ON CONFLICT (set_id, artist_id) DO NOTHING
    `);
    await tx.delete(setArtists).where(eq(setArtists.setId, fromSetId));
    const afterArtists = await tx
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(setArtists)
      .where(eq(setArtists.setId, intoSetId));
    const artistsMoved =
      (afterArtists[0]?.count ?? 0) - (beforeArtists[0]?.count ?? 0);

    // saved_sets — per-user dedup
    const savesBefore = await tx
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(savedSets)
      .where(eq(savedSets.setId, intoSetId));
    await tx.execute(sql`
      INSERT INTO saved_sets (user_id, set_id, created_at)
      SELECT user_id, ${intoSetId}::uuid, created_at
      FROM saved_sets
      WHERE set_id = ${fromSetId}::uuid
      ON CONFLICT (user_id, set_id) DO NOTHING
    `);
    await tx.delete(savedSets).where(eq(savedSets.setId, fromSetId));
    const savesAfter = await tx
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(savedSets)
      .where(eq(savedSets.setId, intoSetId));
    const savesMoved = (savesAfter[0]?.count ?? 0) - (savesBefore[0]?.count ?? 0);

    // collection_sets — per-collection dedup
    const collectionsBefore = await tx
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(collectionSets)
      .where(eq(collectionSets.setId, intoSetId));
    await tx.execute(sql`
      INSERT INTO collection_sets (collection_id, set_id, created_at)
      SELECT collection_id, ${intoSetId}::uuid, created_at
      FROM collection_sets
      WHERE set_id = ${fromSetId}::uuid
      ON CONFLICT (collection_id, set_id) DO NOTHING
    `);
    await tx.delete(collectionSets).where(eq(collectionSets.setId, fromSetId));
    const collectionsAfter = await tx
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(collectionSets)
      .where(eq(collectionSets.setId, intoSetId));
    const collectionsMoved =
      (collectionsAfter[0]?.count ?? 0) - (collectionsBefore[0]?.count ?? 0);

    // tracklist_entries — drop from-side entirely (timestamps describe ONE
    // source; mixing across sources produces nonsense).
    const tracklistDrop = await tx.execute<{ count: string }>(sql`
      WITH deleted AS (
        DELETE FROM tracklist_entries
        WHERE set_id = ${fromSetId}::uuid
        RETURNING id
      )
      SELECT COUNT(*)::text AS count FROM deleted
    `);
    const tracklistDropped = Number(tracklistDrop[0]?.count ?? 0);

    // Slug redirect — old slug now points at canonical
    await tx.execute(sql`
      INSERT INTO set_slug_redirects (old_slug, new_set_id)
      VALUES (${preview.from.slug}, ${intoSetId}::uuid)
      ON CONFLICT (old_slug) DO UPDATE
        SET new_set_id = EXCLUDED.new_set_id, merged_at = NOW()
    `);

    // Mark the from set as merged
    await tx
      .update(sets)
      .set({
        mergedIntoSetId: intoSetId,
        status: "merged",
        mergeCandidateFor: null,
      })
      .where(eq(sets.id, fromSetId));

    // Refresh the search materialized view so merged-from drops out of search.
    await tx.execute(sql`SELECT refresh_search_view()`);

    return {
      setId: intoSetId,
      fromSlug: preview.from.slug,
      moved: {
        sources: sourcesMoved,
        artists: artistsMoved,
        saves: savesMoved,
        collectionMemberships: collectionsMoved,
      },
      droppedSourceUrlCollisions: droppedUrlCollisions,
      droppedTracklistEntries: tracklistDropped,
    };
  });

  revalidatePath("/admin/sets");
  revalidatePath(`/sets/${preview.from.slug}`);
  revalidatePath(`/sets/${preview.into.slug}`);

  return result;
}

async function loadPreview(
  fromSetId: string,
  intoSetId: string
): Promise<MergePreview> {
  const blockers: string[] = [];
  if (fromSetId === intoSetId) blockers.push("cannot merge a set into itself");

  const [from, into] = await Promise.all([
    summarizeSet(fromSetId),
    summarizeSet(intoSetId),
  ]);
  if (!from) blockers.push(`source set ${fromSetId} not found`);
  if (!into) blockers.push(`target set ${intoSetId} not found`);
  if (from?.status === "merged")
    blockers.push(`source set is already merged`);
  if (into?.status === "merged")
    blockers.push(`target set is already merged`);

  const placeholder: SetSummary = {
    id: "",
    title: "",
    slug: "",
    status: "",
    sources: 0,
    artists: 0,
    saves: 0,
    collectionMemberships: 0,
    tracklist: 0,
  };

  let sourceCollisions = 0;
  let newArtists = 0;
  let newSaves = 0;
  let newCollections = 0;
  if (from && into) {
    const collisionRows = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*)::text AS count
      FROM sources f
      WHERE f.set_id = ${fromSetId}::uuid
        AND f.url IN (SELECT url FROM sources WHERE set_id = ${intoSetId}::uuid)
    `);
    sourceCollisions = Number(collisionRows[0]?.count ?? 0);

    const artistRows = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*)::text AS count
      FROM set_artists f
      WHERE f.set_id = ${fromSetId}::uuid
        AND NOT EXISTS (
          SELECT 1 FROM set_artists t
          WHERE t.set_id = ${intoSetId}::uuid AND t.artist_id = f.artist_id
        )
    `);
    newArtists = Number(artistRows[0]?.count ?? 0);

    const savesRows = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*)::text AS count
      FROM saved_sets f
      WHERE f.set_id = ${fromSetId}::uuid
        AND NOT EXISTS (
          SELECT 1 FROM saved_sets t
          WHERE t.set_id = ${intoSetId}::uuid AND t.user_id = f.user_id
        )
    `);
    newSaves = Number(savesRows[0]?.count ?? 0);

    const collectionRows = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*)::text AS count
      FROM collection_sets f
      WHERE f.set_id = ${fromSetId}::uuid
        AND NOT EXISTS (
          SELECT 1 FROM collection_sets t
          WHERE t.set_id = ${intoSetId}::uuid AND t.collection_id = f.collection_id
        )
    `);
    newCollections = Number(collectionRows[0]?.count ?? 0);
  }

  return {
    from: from ?? placeholder,
    into: into ?? placeholder,
    willMove: {
      sources: (from?.sources ?? 0) - sourceCollisions,
      sourceUrlCollisions: sourceCollisions,
      artists: newArtists,
      saves: newSaves,
      collectionMemberships: newCollections,
      tracklistDropped: from?.tracklist ?? 0,
    },
    blockers,
  };
}

async function summarizeSet(setId: string): Promise<SetSummary | null> {
  const [row] = await db
    .select({
      id: sets.id,
      title: sets.title,
      slug: sets.slug,
      status: sets.status,
    })
    .from(sets)
    .where(eq(sets.id, setId))
    .limit(1);
  if (!row) return null;

  const counts = await db.execute<{
    sources: string;
    artists: string;
    saves: string;
    collection_memberships: string;
    tracklist: string;
  }>(sql`
    SELECT
      (SELECT COUNT(*) FROM sources WHERE set_id = ${setId}::uuid)::text AS sources,
      (SELECT COUNT(*) FROM set_artists WHERE set_id = ${setId}::uuid)::text AS artists,
      (SELECT COUNT(*) FROM saved_sets WHERE set_id = ${setId}::uuid)::text AS saves,
      (SELECT COUNT(*) FROM collection_sets WHERE set_id = ${setId}::uuid)::text AS collection_memberships,
      (SELECT COUNT(*) FROM tracklist_entries WHERE set_id = ${setId}::uuid)::text AS tracklist
  `);
  const c = counts[0];

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    sources: Number(c?.sources ?? 0),
    artists: Number(c?.artists ?? 0),
    saves: Number(c?.saves ?? 0),
    collectionMemberships: Number(c?.collection_memberships ?? 0),
    tracklist: Number(c?.tracklist ?? 0),
  };
}

