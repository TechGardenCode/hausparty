# Audit Log

Decisions significant enough to affect future work. Each entry captures what was decided, why, and what was rejected.

---

## 2026-04-16 — Scraping + auditing pipeline redesign (plans 08–10)

Three plans shipped together to close structural gaps in the discovery pipeline: no durable raw data, divergent dedup contracts between the two upload paths, and no admin merge primitive for existing duplicates. Each decision below is load-bearing for future work on plans 11 (scheduled cron) and 12 (scanner merge-candidate detection).

### Plan 08 — Raw metadata archive

**Decision:** Store every scraper fetch verbatim in `scraper_raw_payloads` (JSONB, unique on `(scraper, entity_type, external_id, fetched_at)` so every version is retained), and ship a replay admin action that re-runs `normalize + upsert` from the latest archived row per external id.

**Why:** EDMTrain's API is forward-looking only; if we evolve normalization logic later (better B2B parsing, stricter festival detection), the only way to re-derive historical events is from stored raw payloads. Idempotence via existing `scraperEntityMap` unique constraints means replay is safe.

**Rejected:** Storing only the latest version per external id. Would prevent us from comparing pre/post normalization drift and from time-travelling to reproduce a specific day's catalog state.

### Plan 09 — Unified dedup contract (`findOrLinkSet`)

#### 2a. Fuzzy (artist, date) window = ±1 day

**Decision:** When `eventId` is absent but `performedAt` is known, step 3 of the cascade links to any existing set with the same primary artist whose `performedAt` is within ±1 day.

**Why:** Festival days cross midnight UTC (set starts Saturday 23:30, ends Sunday 02:00) so exact-date match misses the common case. ±3 days was considered but risks grouping separate weekend residencies (Fri + Sat sets at the same club).

**Rejected:** Exact-date match (too strict, misses timezone drift between data sources); ±3 day (too lax, groups separate appearances).

#### 2b. Title trigram never auto-links

**Decision:** Step 4 of the cascade (same artist, title trigram ≥0.75, no event/date evidence) creates a new set and stamps `merge_candidate_for` pointing at the similar set — it does NOT auto-link.

**Why:** Title similarity alone is too noisy to fold two distinct performances into one. "John Summit at Tomorrowland 2024" and "John Summit at EDC 2024" both have the artist name + year — different events. A wrong auto-link is reversible only through plan 10's merge tool; surfacing the candidate to admin keeps humans in the loop.

**Rejected:** Auto-link at ≥0.85 (accepted some bad merges as convenience); require date-known + trigram (half-measure that still auto-acted on uncertain signal).

#### 2c. B2B auto-enrichment on `linked_existing`

**Decision:** When a new submission links to an existing set (steps 2 or 3), any B2B artist ids in the submission that aren't already on the set's lineup are inserted via `ON CONFLICT DO NOTHING`.

**Why:** B2B lineups surface incrementally from multiple sources — the original submission might have missed a co-headliner the second upload correctly names. Enriching the lineup over time beats keeping the partial original.

**Rejected:** Ignore extra B2B (loses signal); flag lineup mismatch for review (high admin burden on common case).

### Plan 10 — Admin merge tool

#### 3a. Tracklist drop on merge (not append)

**Decision:** When merging set A into set B, all `tracklist_entries` on A are DELETEd. B's tracklist wins.

**Why:** A tracklist describes ONE source's audio — timestamps are anchored to that specific playthrough. Interleaving two tracklists produces invalid timestamps (position 1 at 00:00, position 2 at 00:08 from A, position 3 at 00:00 from B's video). The semantic cost of preserving A's tracklist is nil since it no longer has a matching source inside the canonical record.

**Rejected:** Append with position offset (the plan's original default — produces nonsense timestamps); block the merge if both have tracklists (slows cleanup on the common case where neither or only one has a tracklist).

#### 3b. URL-collision delete losing side

**Decision:** Before transferring sources from A to B, any source on A with a URL that already exists on B is DELETEd outright. The canonical (B) already has that URL; the duplicate is lossless.

**Why:** `sources.url` is unique across the table — attempting the UPDATE without pre-cleanup would error and roll back the merge. Duplicate URLs across the merge pair are often *why* the admin is merging, so rejecting the merge on collision would block the common case.

**Rejected:** Error the whole transaction (safer but blocks exactly the cases we want to clean up).

#### 3c. Slug redirect + status='merged' + chain follow

**Decision:** On merge, (1) insert `set_slug_redirects(old_slug → intoSetId)`, (2) set `sets.status = 'merged'` and `merged_into_set_id = intoSetId` on the from-set, (3) the `/sets/[slug]` page resolves redirects up to 5 hops through `merged_into_set_id` so A→B→C still lands at C if B gets re-merged later.

**Why:** Bookmarks, shared links, Google cache all hold the old slug; permanent redirect preserves that link surface. The status flag + merged_into pointer is the primary source of truth; the redirect table is the fast lookup.

**Known tradeoff:** The redirect fires correctly for browsers (Next.js emits `NEXT_REDIRECT` in the RSC stream which the client honors), but direct HTTP clients (curl, some scrapers) see `200 OK` with the source slug's metadata because Next.js 16's streaming commits the response head before the page body throws. A true wire-level 308 requires middleware running in the Node.js runtime (Drizzle needs Node), which is feasible but not shipped in plan 10. Revisit if non-browser clients hitting merged slugs becomes a real issue.

**Rejected:** Hard-delete the from-set (destroys bookmarks, breaks Google index); keep slug-only redirect without status change (merged sets would still appear in admin filters and search).

---

## Conventions

- Lead with the decision, not the exploration.
- Capture *why* and *what was rejected* — future readers should be able to judge whether the rationale still holds.
- Add the date as the heading; keep entries chronological descending.
- Operational work (the implementation itself, tests, migrations) belongs in `CHANGELOG.md` instead.
