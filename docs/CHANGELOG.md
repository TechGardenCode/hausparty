# Changelog

Operational log — implementations, migrations, tests, refactors. Decisions with lasting consequences live in `AUDIT_LOG.md`.

Most recent first.

---

## 2026-04-17 — Quality audit stage 2: lint cleanup & type hygiene

**Scope**
- Drove `npm run lint` warnings from 35 → 0 via mechanical rule fixes.
- Flipped `lint` to strict (`--max-warnings=0`) so any new warning breaks CI.

**Changes**
- `eslint.config.mjs` — added `@typescript-eslint/no-unused-vars` override with `argsIgnorePattern: '^_'`, `varsIgnorePattern: '^_'`, `caughtErrorsIgnorePattern: '^_'`. Closes the gap that Stage 2's plan assumed was already configured.
- `package.json` — `lint` script is now `eslint --max-warnings=0`; both local and CI share one strict definition of clean. Stage 1's CI YAML needs no change.
- 7 `<img>` warnings silenced with `eslint-disable-next-line @next/next/no-img-element` + a reason comment each. Image URLs come from arbitrary external hosts (artist avatars, festival heroes, discovery thumbs); whitelisting every SC/YT/RA subdomain would flake more than it saves.
- 3 k6 anonymous default exports now named (`adminFlood`, `mixedTraffic`, `searchSpam`) — k6 ignores the name but ESLint now accepts the export.
- Unused imports removed in: `discovery-queue.tsx` (`Link`, `ExternalLink`), `reports-queue.tsx` (`XCircle`), `artists/page.tsx` (`GenreChip`), `queries/artists.ts` (`sets`, `and`, `desc`), `healing/scanner.ts` (`setArtists`, `sources`, `events`, `isNull`).
- Unused params/vars renamed with `_` prefix: `healing/scanner.ts` (`source` → `_source`), `event-names.ts` (`festivalName` → `_festivalName`), `admin.test.ts` (`selectCount` → `_selectCount`).

**Non-goals honored**
- No component logic refactored.
- ESLint preset still `next/core-web-vitals + next/typescript`.
- No remote image hosts added to `next.config.ts` — intentional.

**Verification**
- `npm run lint` (now strict) exits 0.
- `npx tsc --noEmit` clean.
- `npm run test` 373/373.
- Remote verification pending: introduce a stray `console.log`, push, confirm CI fails.

---

## 2026-04-17 — Quality audit stage 1: CI quality gate

**Scope**
- CI now runs `npm ci` → lint → `tsc --noEmit` → Vitest with coverage before the Docker build; `build` job gains `needs: quality`.
- Vitest configured with v8 coverage (`text` + `json-summary` reporters) and regression-floor thresholds calibrated against today's numbers.
- Five pre-existing TypeScript errors in test files fixed; 373/373 tests still pass.

**Changes**
- `.github/workflows/ci.yml` — new `quality` job gates `build`.
- `vitest.config.ts` — v8 coverage, thresholds: lines 65, functions 50, branches 60, statements 65 (actual: 69.56 / 51.38 / 66.57 / 67.39).
- `package.json` — add dev dep `@vitest/coverage-v8`.
- `.dockerignore` — ignore `coverage/` (already in `.gitignore`).
- Test fixes:
  - `src/components/player/player-context.test.ts` — `makeSource` now matches the Drizzle-derived `Source` shape (camelCase fields, `createdAt: Date`, drop non-existent quality/view/checked columns).
  - `src/lib/services/artist-matching.test.ts`, `src/lib/services/sets/find-or-link.test.ts` — widen Proxy index signature to `Record<string | symbol, unknown>` so the `innerProp` forwarder type-checks.
  - `src/lib/services/scrapers/edmtrain.test.ts` — cast the fixture through `unknown` to allow the `name: null` test entry that `EdmtrainRawEvent` models as `name?: string`.

**Non-goals (deferred to later quality-audit stages)**
- Lint warnings (35 today) still allowed — Stage 2 flips `lint` to `--max-warnings 0`.
- Coverage thresholds are regression floors only, not aspirations.
- No Playwright yet (Stage 4).

**Verification**
- Local: `npx tsc --noEmit` clean, `npm run test` 373/373, `npx vitest run --coverage` prints the summary, `npm run lint` exit 0 (warnings only).
- Remote: push a throwaway branch breaking one test to confirm `build` stays unexecuted while `quality` fails.

---

## 2026-04-17 — Promoted hausparty to prod (plan 07)

- Image `cc7c8e2` promoted to prod via homelab PR #157 (merged at 13:43:44Z)
- ArgoCD app `1276-prod.hausparty.hausparty` Synced + Healthy on revision `62f7199`
- PreSync `hausparty-migrate` Job completed at 13:44:14Z — migration 0011 (play_events + user_activity) applied to the prod CNPG cluster
- 2/2 replicas Ready on `cc7c8e2`; `https://hausparty.techgarden.gg/api/health` → 200 ok
- Total rollout time: ~30s from merge to healthy

---

## 2026-04-16 — Plan 07: player continuity & watch history

**Scope**
- Client-side resume via `localStorage` slot `hausparty:resume` (single slot, 24h TTL)
- Server-side watch history keyed on `(user_id, set_id, started_at)` play sessions
- Lightweight `user_activity` audit trail for admin visibility

**Schema changes** (`drizzle/0011_wide_red_ghost.sql`, additive only)
- New enum: `user_action` (`view_set | play | save | report | submit`)
- New table `play_events`: session row per play, upsert on `(user_id, set_id, started_at)`; tracks `last_position_seconds`, `duration_listened_seconds`, `last_heartbeat_at`
- New table `user_activity`: generic `(action, target_type, target_id)` event log
- Indexes: `play_events_session_unique`, `play_events_user_recent_idx`, `play_events_set_idx`, `user_activity_user_created_idx`, `user_activity_target_idx`

**Key changes**
- `PlayerProvider` now tracks `startedAt` + `startPositionSeconds`; drives a 5 s client heartbeat that writes `localStorage` every tick and flushes `/api/play` every 30 s plus on `pagehide`/`visibilitychange=hidden` via `sendBeacon`
- `useResumeEntry` hook (`useSyncExternalStore`-backed) exposes the current resume slot; `ResumePrompt` component renders a dismissible pill when an entry <24 h exists and the player is idle
- `/sets/[slug]?resume=N` forwards `N` into `SourceSwitcher` → `play()` → embed URL (`&start=` for YouTube, `#t=Ns` for SoundCloud)
- `POST /api/play` (nodejs runtime) upserts a `play_events` row; records a `play` `user_activity` row only on the `start` beat
- New query layer: `getRecentPlays(userId)` collapses sessions to one row per set; `getContinueListening(userId)` filters for unfinished sets
- New pages: `/history` (authed, reverse-chronological) and `/admin/users/[id]/activity` (admin)
- Existing mutations (`toggleSaveSet`, `submitReport`, `submitSet`) + the set page RSC now emit `user_activity` rows via the shared `recordUserActivity` helper

**Verification**
- `npm run lint`: 0 errors (35 pre-existing warnings untouched)
- `npm run test`: 373/373 passing (+25 from plan 07)
  - `src/lib/hooks/use-resume.test.ts` — localStorage read/write/clear, TTL, SSR guard
  - `src/lib/player/parse-body.test.ts` — `/api/play` body validator (accept + 12 reject cases)
  - `src/lib/actions/play.test.ts` — `recordPlayEvent` upsert, position flooring, activity-log-on-start-only
  - `src/lib/player/embed-url.test.ts` — extended with `start=` (YouTube) and `#t=Ns` (SoundCloud) resume cases
- Fixed during validation: `visibilitychange` listener in `PlayerProvider` now has a paired `removeEventListener` on cleanup (previously leaked on every status transition)
- Migration is additive only (new enum, tables, indexes; no destructive ops)

**Known limitations** (see AUDIT_LOG for decision)
- Wall-clock fallback only active for the ~300–800 ms between iframe mount and bridge `onReady`; after that, all positions come from the true iframe APIs.

**Follow-up during validation** (same day)
- Replaced the wall-clock position tracker with a proper iframe bridge: `src/lib/player/media-bridge.ts` loads the YT IFrame API / SC Widget API on demand, exposes `{ getPosition, dispose }`, and auto-fires `stop()` on the media's ended lifecycle.
- `PlayerProvider` now accepts a `registerPositionGetter(getter | null)`; heartbeats prefer the bridge value and fall back to wall-clock only during the pre-ready window.
- `src/lib/player/embed-url.ts` adds `enablejsapi=1` for YouTube (required for the IFrame Player API).
- Fixed handles pause naturally (position freezes), seek (next heartbeat reads the true position), and end-of-set (clears resume + sends `end` beacon automatically).
