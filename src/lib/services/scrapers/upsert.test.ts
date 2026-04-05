import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NormalizedEvent } from "./types";

// Mock slugify
vi.mock("@/lib/utils", () => ({
  slugify: (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
  cn: (...args: unknown[]) => args.join(" "),
}));

// Mock artist matching
const mockFindOrCreateArtist = vi.fn(async (name: string) => ({
  artistId: `artist-${name.toLowerCase().replace(/\s+/g, "-")}`,
  action: "created" as const,
}));

vi.mock("@/lib/services/artist-matching", () => ({
  findOrCreateArtist: (...args: unknown[]) => mockFindOrCreateArtist(args[0] as string),
}));

// ---- Drizzle db mock ----
// We track inserts and configure select results per scenario.

let entityMapHit: string | null = null;
let idCounter = 0;
const insertLog: { table: string; values: unknown }[] = [];

/**
 * Creates a deeply-chainable proxy that mimics Drizzle's query builder.
 * Terminal methods (.limit, .returning, .onConflictDoNothing) resolve promises.
 * We identify which table is being operated on by inspecting the Drizzle table
 * object's Symbol(drizzle:Name) or _name property passed to .from() / .insert().
 */
function getTableName(tableObj: unknown): string {
  // Drizzle table objects expose their SQL name via Symbol or internal properties
  if (tableObj && typeof tableObj === "object") {
    const sym = Object.getOwnPropertySymbols(tableObj).find((s) =>
      s.toString().includes("Name")
    );
    if (sym) return String((tableObj as Record<symbol, unknown>)[sym]);
    // Fallback for pgTable objects
    if ("_" in tableObj && typeof (tableObj as Record<string, unknown>)._ === "object") {
      const inner = (tableObj as { _: Record<string, unknown> })._;
      if (inner.name) return String(inner.name);
    }
  }
  return "unknown";
}

function createChainProxy(context: { tableName: string; op: string }): unknown {
  return new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === "then" || prop === "catch" || prop === "finally") return undefined;
      return (...args: unknown[]) => {
        // Track the table name from .from() or .insert()
        if (prop === "from") {
          context.tableName = getTableName(args[0]);
        }
        // Terminal: .limit() — resolve the select chain
        if (prop === "limit") {
          if (context.tableName === "scraper_entity_map" && entityMapHit) {
            const hit = entityMapHit;
            entityMapHit = null;
            return Promise.resolve([{ internalId: hit }]);
          }
          // festivals/events slug lookup → not found
          return Promise.resolve([]);
        }
        // Terminal: .returning() — resolve an insert with a mock ID
        if (prop === "returning") {
          idCounter++;
          return Promise.resolve([{ id: `mock-id-${idCounter}` }]);
        }
        // Terminal: .onConflictDoNothing()
        if (prop === "onConflictDoNothing") {
          return Promise.resolve();
        }
        // .values() in an insert chain — log the insert
        if (prop === "values") {
          insertLog.push({ table: context.tableName, values: args[0] });
        }
        // Continue the chain
        return createChainProxy(context);
      };
    },
    apply(_target, _thisArg, _args) {
      return createChainProxy(context);
    },
  });
}

const mockDb = {
  select: (..._args: unknown[]) => createChainProxy({ tableName: "", op: "select" }),
  insert: (tableObj: unknown) => {
    const tableName = getTableName(tableObj);
    return createChainProxy({ tableName, op: "insert" });
  },
  update: (tableObj: unknown) => {
    const tableName = getTableName(tableObj);
    return createChainProxy({ tableName, op: "update" });
  },
  execute: vi.fn().mockResolvedValue(undefined),
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

const { upsertEvent } = await import("./upsert");

describe("upsertEvent", () => {
  const baseEvent: NormalizedEvent = {
    externalId: "edmtrain-event-1",
    name: "Test Event",
    date: "2026-03-20",
    location: "Berlin, Germany",
    venue: "Berghain",
    artists: [{ externalId: "edmtrain-artist-1", name: "Test Artist" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    insertLog.length = 0;
    entityMapHit = null;
    idCounter = 0;
    mockFindOrCreateArtist.mockImplementation(async (name: string) => ({
      artistId: `artist-${name.toLowerCase().replace(/\s+/g, "-")}`,
      action: "created" as const,
    }));
  });

  it("creates new event and returns 'created'", async () => {
    const result = await upsertEvent("edmtrain", baseEvent);

    expect(result.action).toBe("created");
    expect(result.eventId).toBeTruthy();
  });

  it("skips when entity_map already has a mapping", async () => {
    entityMapHit = "existing-event-id";

    const result = await upsertEvent("edmtrain", baseEvent);

    expect(result.action).toBe("skipped");
    expect(result.eventId).toBe("existing-event-id");
  });

  it("creates festival when festivalName is provided", async () => {
    const festivalEvent: NormalizedEvent = {
      ...baseEvent,
      festivalName: "Tomorrowland",
    };

    const result = await upsertEvent("edmtrain", festivalEvent);

    expect(result.action).toBe("created");
    const festivalInserts = insertLog.filter((op) => op.table === "festivals");
    expect(festivalInserts.length).toBeGreaterThanOrEqual(1);
  });

  it("handles event with multiple artists", async () => {
    const multiArtistEvent: NormalizedEvent = {
      ...baseEvent,
      artists: [
        { externalId: "edmtrain-artist-1", name: "Artist A" },
        { externalId: "edmtrain-artist-2", name: "Artist B" },
        { externalId: "edmtrain-artist-3", name: "Artist C" },
      ],
    };

    const result = await upsertEvent("edmtrain", multiArtistEvent);

    expect(result.action).toBe("created");
    expect(mockFindOrCreateArtist).toHaveBeenCalledTimes(3);
    // event_artists inserts for each artist
    const eventArtistInserts = insertLog.filter((op) => op.table === "event_artists");
    expect(eventArtistInserts).toHaveLength(3);
  });
});
