import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/utils", () => ({
  slugify: (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
}));

// ---------- Drizzle db mock ----------
//
// Strategy: FIFO queues per terminal operator. Tests push canned results in the
// order the cascade will query. Insert .returning() calls pop from an insert
// queue. .execute() is its own mock (used for the pg_trgm trigram query).

const selectQueue: unknown[][] = [];
const insertQueue: Array<{ id: string }[]> = [];
const mockExecute = vi.fn();
const insertValuesSink: unknown[] = [];

function makeSelectChain(): unknown {
  return new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then" || prop === "catch" || prop === "finally")
        return undefined;
      return (..._args: unknown[]) => {
        if (prop === "limit" || prop === "orderBy") {
          // limit is terminal; orderBy-before-limit forwards to limit
          if (prop === "limit") {
            return Promise.resolve(selectQueue.shift() ?? []);
          }
          return makeSelectChain();
        }
        if (prop === "where") {
          // .where() is intermediate; but for the enrichLineup select (no .limit)
          // it must resolve too. Return a thenable that resolves to the next
          // queued result if `then` is accessed directly.
          const chain = makeSelectChain();
          return new Proxy(chain as object, {
            get(target, innerProp) {
              if (innerProp === "then") {
                return (resolve: (v: unknown) => void) =>
                  resolve(selectQueue.shift() ?? []);
              }
              if (innerProp === "catch" || innerProp === "finally")
                return undefined;
              return (target as Record<string, unknown>)[innerProp];
            },
          });
        }
        return makeSelectChain();
      };
    },
    apply() {
      return makeSelectChain();
    },
  });
}

function makeInsertChain(): unknown {
  return new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then" || prop === "catch" || prop === "finally")
        return undefined;
      return (...args: unknown[]) => {
        if (prop === "values") {
          insertValuesSink.push(args[0]);
          // Return a thenable so .onConflictDoNothing() OR .returning() both work.
          const chain = makeInsertChain();
          return new Proxy(chain as object, {
            get(target, innerProp) {
              if (innerProp === "then") {
                return (resolve: (v: unknown) => void) => resolve(undefined);
              }
              if (innerProp === "returning") {
                return () => Promise.resolve(insertQueue.shift() ?? [{ id: "fallback-id" }]);
              }
              if (innerProp === "onConflictDoNothing") {
                return () => Promise.resolve();
              }
              if (innerProp === "catch" || innerProp === "finally") return undefined;
              return (target as Record<string, unknown>)[innerProp];
            },
          });
        }
        if (prop === "returning") {
          return Promise.resolve(insertQueue.shift() ?? [{ id: "fallback-id" }]);
        }
        if (prop === "onConflictDoNothing") {
          return () => Promise.resolve();
        }
        return makeInsertChain();
      };
    },
    apply() {
      return makeInsertChain();
    },
  });
}

const mockDb = {
  select: () => makeSelectChain(),
  insert: () => makeInsertChain(),
  execute: mockExecute,
};

vi.mock("@/lib/db", () => ({
  db: new Proxy(
    {},
    {
      get(_target, prop) {
        const val = (mockDb as Record<string | symbol, unknown>)[prop];
        if (typeof val === "function") return val.bind(mockDb);
        return val;
      },
    }
  ),
}));

const { findOrLinkSet } = await import("./find-or-link");

// ---------- Helpers to reset state ----------

function resetState() {
  selectQueue.length = 0;
  insertQueue.length = 0;
  insertValuesSink.length = 0;
  mockExecute.mockReset();
  mockExecute.mockResolvedValue([]);
}

// Common baseline input
const baseInput = {
  primaryArtistId: "artist-1",
  sourceUrl: "https://www.youtube.com/watch?v=abc",
  platform: "youtube" as const,
  sourceType: "fan" as const,
};

describe("findOrLinkSet cascade", () => {
  beforeEach(() => {
    resetState();
  });

  it("step 1: URL match returns added_source with confidence 1.0", async () => {
    // URL lookup — hit
    selectQueue.push([{ setId: "existing-set-a" }]);

    const result = await findOrLinkSet({ ...baseInput });

    expect(result).toMatchObject({
      setId: "existing-set-a",
      action: "added_source",
      matchReason: "url",
      confidence: 1.0,
    });
    // No inserts should fire
    expect(insertValuesSink).toHaveLength(0);
  });

  it("step 2: hard artist+event match inserts source + enriches lineup", async () => {
    // 1. url lookup -> miss
    selectQueue.push([]);
    // 2. artist+event lookup -> hit
    selectQueue.push([{ setId: "set-event-1" }]);
    // 3. enrichLineup read of existing artists
    selectQueue.push([{ artistId: "artist-1" }]);

    const result = await findOrLinkSet({
      ...baseInput,
      eventId: "event-42",
      b2bArtistIds: ["artist-b2b-1"],
    });

    expect(result.action).toBe("linked_existing");
    expect(result.matchReason).toBe("artist_event");
    expect(result.confidence).toBe(1.0);

    // Source insert + one lineup insert for the new B2B (primary already present)
    const sourceInsert = insertValuesSink.find(
      (v) => (v as { url?: string }).url === baseInput.sourceUrl
    );
    expect(sourceInsert).toBeDefined();

    const b2bInsert = insertValuesSink.find(
      (v) => (v as { artistId?: string }).artistId === "artist-b2b-1"
    );
    expect(b2bInsert).toBeDefined();

    // Primary artist was already in the existing lineup — no duplicate insert
    const primaryInserts = insertValuesSink.filter(
      (v) => (v as { artistId?: string }).artistId === "artist-1"
    );
    expect(primaryInserts).toHaveLength(0);
  });

  it("step 3: fuzzy artist+date (±1 day) match when eventId is absent", async () => {
    // 1. url lookup -> miss
    selectQueue.push([]);
    // 2. artist+date lookup -> hit (no eventId path short-circuits step 2)
    selectQueue.push([{ setId: "set-date-1" }]);
    // 3. enrichLineup read of existing artists
    selectQueue.push([{ artistId: "artist-1" }]);

    const result = await findOrLinkSet({
      ...baseInput,
      performedAt: new Date("2026-03-20T06:00:00Z"),
      sourceUrl: "https://www.youtube.com/watch?v=second-upload",
    });

    expect(result).toMatchObject({
      setId: "set-date-1",
      action: "linked_existing",
      matchReason: "artist_date",
      confidence: 0.85,
    });
  });

  it("step 4: title trigram DOES NOT auto-link; creates a new set flagged for review", async () => {
    // 1. url lookup -> miss
    selectQueue.push([]);
    // 2. artist+event -> skipped (no eventId)
    // 3. artist+date -> skipped (no performedAt)
    // 4. trigram candidate via execute — hit (but never auto-links)
    mockExecute.mockResolvedValueOnce([{ id: "candidate-set-7" }]);
    // 5. createSetWithLineup: artist name lookup
    selectQueue.push([{ name: "John Summit" }]);
    // Insert: sets row, source row, one set_artists row (primary)
    insertQueue.push([{ id: "new-set-xyz" }]);

    const result = await findOrLinkSet({
      ...baseInput,
      titleHint: "John Summit Tomorrowland 2024 Mainstage",
    });

    expect(result.action).toBe("created");
    expect(result.matchReason).toBe("title_candidate");
    expect(result.mergeCandidateFor).toBe("candidate-set-7");
    expect(result.setId).toBe("new-set-xyz");

    // Sanity: sets insert should carry the merge_candidate_for pointer
    const setsInsert = insertValuesSink.find(
      (v) => (v as { title?: string }).title === "John Summit Tomorrowland 2024 Mainstage"
    );
    expect((setsInsert as { mergeCandidateFor: string }).mergeCandidateFor).toBe(
      "candidate-set-7"
    );
  });

  it("step 5 / new: no match at any tier produces a clean new set", async () => {
    selectQueue.push([]); // url miss
    mockExecute.mockResolvedValueOnce([]); // trigram miss
    selectQueue.push([{ name: "Unknown DJ" }]); // artist name lookup
    insertQueue.push([{ id: "fresh-set-1" }]);

    const result = await findOrLinkSet({
      ...baseInput,
      titleHint: "Some Brand New Performance",
    });

    expect(result.action).toBe("created");
    expect(result.matchReason).toBe("new");
    expect(result.mergeCandidateFor).toBeUndefined();
    expect(result.setId).toBe("fresh-set-1");
  });

  it("lineup enrichment skips artists already present", async () => {
    // URL miss, event match, existing lineup already contains b2b-1
    selectQueue.push([]);
    selectQueue.push([{ setId: "set-e" }]);
    selectQueue.push([
      { artistId: "artist-1" },
      { artistId: "artist-b2b-1" },
    ]);

    await findOrLinkSet({
      ...baseInput,
      eventId: "event-42",
      b2bArtistIds: ["artist-b2b-1", "artist-b2b-2"],
    });

    // Only artist-b2b-2 should be inserted — the other two are already in the lineup
    const lineupInserts = insertValuesSink.filter(
      (v) => "artistId" in (v as object)
    );
    expect(lineupInserts).toHaveLength(1);
    expect((lineupInserts[0] as { artistId: string }).artistId).toBe(
      "artist-b2b-2"
    );
  });

  it("no title hint → skips trigram lookup entirely", async () => {
    selectQueue.push([]); // url miss
    // no execute call expected
    selectQueue.push([{ name: "Some Artist" }]); // artist name lookup
    insertQueue.push([{ id: "new-set-id" }]);

    const result = await findOrLinkSet({ ...baseInput });

    expect(mockExecute).not.toHaveBeenCalled();
    expect(result.action).toBe("created");
    expect(result.matchReason).toBe("new");
  });
});
