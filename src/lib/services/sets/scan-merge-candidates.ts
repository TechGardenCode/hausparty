import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const DEFAULT_THRESHOLD = 0.75;
const DEFAULT_DATE_WINDOW_DAYS = 7;
const DEFAULT_LIMIT = 500;

export interface ScanOptions {
  threshold?: number;
  dateWindowDays?: number;
  dryRun?: boolean;
  limit?: number;
}

export interface CandidatePair {
  loserId: string;
  canonicalId: string;
  similarity: number;
}

export interface ScanResult {
  dryRun: boolean;
  threshold: number;
  dateWindowDays: number;
  scanned: number;
  flagged: number;
  pairs: CandidatePair[];
}

/**
 * Scan the current set graph for likely duplicates that pre-date the unified
 * dedup contract (plan 09) and stamp `merge_candidate_for` on the loser.
 *
 * Eligibility:
 *   - Neither set is merged or already flagged.
 *   - Same primary artist (set_artists.position = 0).
 *   - Title trigram similarity >= threshold.
 *   - Date proximity: either missing, or within dateWindowDays days.
 *
 * Canonical picker (best-first):
 *   1. More sources wins.
 *   2. published > draft.
 *   3. Older created_at wins.
 *
 * Idempotent: each loser is flagged at most once per scan (best-similarity
 * canonical), and UPDATE has a `merge_candidate_for IS NULL` guard to avoid
 * races with concurrent findOrLinkSet() flags.
 */
export async function scanMergeCandidates(
  opts: ScanOptions = {}
): Promise<ScanResult> {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const dateWindowDays = opts.dateWindowDays ?? DEFAULT_DATE_WINDOW_DAYS;
  const dryRun = opts.dryRun ?? false;
  const limit = opts.limit ?? DEFAULT_LIMIT;

  const pairRows = await db.execute<{
    loser_id: string;
    canonical_id: string;
    sim: number;
  }>(sql`
    WITH eligible AS (
      SELECT s.id, s.title, s.status, s.performed_at, s.created_at,
             sa.artist_id AS primary_artist_id,
             (SELECT COUNT(*) FROM sources WHERE set_id = s.id) AS src_count
      FROM sets s
      JOIN set_artists sa ON sa.set_id = s.id AND sa.position = 0
      WHERE s.merge_candidate_for IS NULL
        AND s.status <> 'merged'
    ),
    pairs AS (
      SELECT a.id AS a_id, b.id AS b_id,
             similarity(a.title, b.title) AS sim,
             a.src_count AS a_sc, b.src_count AS b_sc,
             a.status AS a_st,   b.status AS b_st,
             a.created_at AS a_c, b.created_at AS b_c
      FROM eligible a
      JOIN eligible b
        ON b.primary_artist_id = a.primary_artist_id
       AND b.id > a.id
      WHERE similarity(a.title, b.title) >= ${threshold}
        AND (
          a.performed_at IS NULL OR b.performed_at IS NULL
          OR ABS(EXTRACT(EPOCH FROM (a.performed_at - b.performed_at)))
             <= ${dateWindowDays} * 86400
        )
    ),
    decided AS (
      SELECT
        sim,
        CASE WHEN a_sc > b_sc THEN b_id
             WHEN b_sc > a_sc THEN a_id
             WHEN a_st = 'published' AND b_st <> 'published' THEN b_id
             WHEN b_st = 'published' AND a_st <> 'published' THEN a_id
             WHEN a_c < b_c THEN b_id
             ELSE a_id
        END AS loser_id,
        CASE WHEN a_sc > b_sc THEN a_id
             WHEN b_sc > a_sc THEN b_id
             WHEN a_st = 'published' AND b_st <> 'published' THEN a_id
             WHEN b_st = 'published' AND a_st <> 'published' THEN b_id
             WHEN a_c < b_c THEN a_id
             ELSE b_id
        END AS canonical_id
      FROM pairs
    )
    SELECT DISTINCT ON (loser_id) loser_id, canonical_id, sim
    FROM decided
    ORDER BY loser_id, sim DESC
    LIMIT ${limit}
  `);

  const pairs: CandidatePair[] = pairRows.map((r) => ({
    loserId: r.loser_id,
    canonicalId: r.canonical_id,
    similarity: Number(r.sim),
  }));

  if (dryRun || pairs.length === 0) {
    return {
      dryRun,
      threshold,
      dateWindowDays,
      scanned: pairs.length,
      flagged: 0,
      pairs,
    };
  }

  let flagged = 0;
  for (const pair of pairs) {
    const result = await db.execute<{ id: string }>(sql`
      UPDATE sets
         SET merge_candidate_for = ${pair.canonicalId}::uuid
       WHERE id = ${pair.loserId}::uuid
         AND merge_candidate_for IS NULL
       RETURNING id
    `);
    if (result.length > 0) flagged++;
  }

  return {
    dryRun,
    threshold,
    dateWindowDays,
    scanned: pairs.length,
    flagged,
    pairs,
  };
}
