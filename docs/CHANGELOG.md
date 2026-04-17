# Changelog

Operational log — implementations, migrations, tests, refactors. Decisions with lasting consequences live in `AUDIT_LOG.md`.

Most recent first.

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
