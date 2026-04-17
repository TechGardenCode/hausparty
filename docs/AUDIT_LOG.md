# Audit Log

Decisions significant enough to affect future work. Each entry captures what was decided, why, and what was rejected.

---

## 2026-04-17 — Quality-audit stage 2: lint conventions

**Type:** engineering

### Underscore-prefixed identifiers are the repo-wide "intentionally unused" signal

**Decision:** `eslint.config.mjs` overrides `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: '^_'`, `varsIgnorePattern: '^_'`, and `caughtErrorsIgnorePattern: '^_'`. Any identifier that starts with `_` is accepted as deliberately unused; every other unused binding is a lint error.

**Why:** The `eslint-config-next/typescript` preset enables the rule at `warn` with no ignore pattern, which made `_args`-style test stubs and harness proxies flag noisily. The standard typescript-eslint idiom gives a clear single rule: want to keep the name for documentation / API compatibility / destructuring symmetry? Prefix with `_`. Otherwise, remove it.

**Rejected:** Per-site `// eslint-disable-next-line` comments (noisy, accumulate unexplained); deleting the offending names outright (loses documentation value in test-harness proxy callbacks where the param shape matters).

### Strict `--max-warnings=0` lives on the `lint` npm script, not in CI YAML

**Decision:** `package.json` `lint` script is `eslint --max-warnings=0`. CI calls `npm run lint`, which is now inherently strict. No `--max-warnings=0` flag in `.github/workflows/ci.yml`.

**Why:** Single definition of "clean lint" — devs running `npm run lint` locally get exactly the same signal as CI. If we ever need a looser local variant (unlikely), add `lint:permissive` rather than decoupling via flags in CI. Flags in CI invite drift: someone adds a pre-commit hook with the loose script and wonders why CI fails.

**Rejected:** Per-plan-02 original wording, `npm run lint -- --max-warnings=0` in CI only. Two definitions of clean = drift waiting to happen.

**Docs updated:** `docs/CHANGELOG.md` (stage 2 operational entry)

---

## 2026-04-17 — Quality-audit stage 1: CI quality-gate policy

**Type:** process / engineering

### Coverage thresholds are regression floors, not aspirations

**Decision:** `vitest.config.ts` thresholds set to lines 65 / functions 50 / branches 60 / statements 65 — each a few points under today's actual numbers (69.56 / 51.38 / 66.57 / 67.39). Future stages of the quality audit raise them when real coverage is added; they never race ahead of the code.

**Why:** A threshold above today's reality would fail the first CI run and train the team to either mass-ratchet it down or disable it — both destroy the signal. A threshold a few points below gives a predictable regression alarm without daily flake.

**Rejected:** Aspirational thresholds (80/80/70/80) — guarantees flake until a separate coverage-push initiative lands, and the test-writing work belongs in Stage 4, not Stage 1. `0/0/0/0` — no regression signal at all.

### Lint warnings remain non-blocking in Stage 1; Stage 2 flips them

**Decision:** `npm run lint` in CI exits 0 on warnings (35 today across the repo). Stage 2 of the quality audit adds `--max-warnings 0` once the warnings are cleaned.

**Why:** Staging the gate prevents a Stage 1 PR from ballooning into a warning-cleanup PR. Stage 1's goal is "PR that forgets `npm run test` cannot merge" — coupling that to a warning purge inflates scope and risks Stage 1 never landing.

**Rejected:** Flip warnings to errors in the same stage — spec creep; Stage 2 has a dedicated plan for it.

### `build` gated on `quality`, not parallel with it

**Decision:** `build` job declares `needs: quality`. The Docker build does not start until lint + tsc + test + coverage all pass.

**Why:** The build is the expensive job (multi-stage Dockerfile, full Next.js production build, ghcr push). Running it in parallel with cheap gates wastes minutes per failing PR and costs GHA runner time for nothing. Sequential gives the correct failure signal first.

**Rejected:** Parallel jobs with a `merge-gate` synthetic check — marginally faster for green PRs, strictly worse for red PRs, added YAML surface area.

**Docs updated:** `docs/CHANGELOG.md` (stage 1 operational entry)

---

## 2026-04-16 — Plan 07: player continuity architecture

### 7a. Position read via the iframe media APIs, wall-clock as fallback

**Decision:** `PersistentIframe` wraps each mounted iframe with a `MediaBridge` that loads `https://www.youtube.com/iframe_api` (YouTube) or `https://w.soundcloud.com/player/api.js` (SoundCloud) on first use, registers a `getPosition()` getter with `PlayerProvider`, and subscribes to the "ended" lifecycle (`YT.PlayerState.ENDED` / `SC.Widget.Events.FINISH`). Heartbeats prefer the bridge getter; they fall back to wall-clock elapsed only during the ~300–800 ms window between iframe mount and the bridge's `onReady`. YouTube embeds include `enablejsapi=1`; SoundCloud widgets need no URL change.

**Why:** The wall-clock approximation initially shipped (resume accurate, `duration_listened_seconds` inaccurate) is fine for pure resume-on-reload but breaks plan 06 trending once it starts counting seconds listened. The proper bridge also catches pause (position stops advancing naturally), seek (next heartbeat picks up the new position), and "ended" (auto-fires `stop()`, which clears the resume slot and ends the play session). Script cost is one-time per tab; both APIs are on the same origin as the iframe we already load.

**Rejected (in this revision):** Wall-clock only (inaccurate `duration_listened_seconds`, no auto-stop on end, can't detect pause). Requires users to manually stop at end of set to avoid stale resume entries.

**Supersedes:** Earlier draft of this entry (dated 2026-04-16 same day) that accepted wall-clock as v1 — superseded during validation review once the bridge integration was scoped and found to be ~150 LOC with no new dependencies.

### 7b. Play session identity = `(user_id, set_id, started_at)`

**Decision:** `play_events` upserts on the composite key `(user_id, set_id, started_at)` with a unique index. Every new `PLAY` dispatch creates a new row (new `startedAt`); heartbeats and `end` updates the existing row.

**Why:** Keeps one row per listening session instead of one row per heartbeat — the history page collapses cleanly via `MAX(last_heartbeat_at) GROUP BY set_id`, and `duration_listened_seconds` per session is a meaningful number. Alternative (one row per heartbeat) would need a separate `sessions` table to aggregate.

**Rejected:** Row per heartbeat (write amplification, extra aggregation layer); row per user-set pair with last-session-wins (loses mid-session replay data, breaks plan 06 play-count).

### 7c. Anonymous play events are dropped server-side

**Decision:** `/api/play` returns `204` with no DB write when the request is unauthenticated; anonymous users get localStorage resume only, no watch history.

**Why:** Keeps `user_activity` + `play_events` tied to a real Keycloak subject — no IP-based bucket, no cookie ID. Plan 06 (trending signals) can use the same `play_events` table as a trusted play-count source (distinct sessions). Anonymous telemetry is OpenPanel's job, not ours.

**Rejected:** Anonymous `session_id` cookie (complicates GDPR story, duplicates OpenPanel); 401 on anon (breaks "silent fallback" behavior — the client would need to branch on auth state to decide whether to POST).

### 7d. `user_activity` logs only on discrete actions, not heartbeats

**Decision:** `user_activity` rows are written on `view_set`, `play` (start beat only), `save`, `report`, `submit` — not on heartbeat or `end`. Recorded via the shared `recordUserActivity()` helper at the mutation's success path.

**Why:** Avoids 1 activity row per 30 s of playback; preserves the activity log as a journey scan rather than a telemetry firehose. Admins care about "user saved X, reported Y, played Z" — not the 40 heartbeats inside Z.

**Rejected:** Logging every beat (noise); logging on every mutation with a generic "mutation" action (loses semantic value for the admin page).

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
