import { describe, it, expect, vi } from "vitest";
import type { NormalizedEvent } from "./types";

vi.mock("@/lib/utils", () => ({
  slugify: (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
  cn: (...args: unknown[]) => args.join(" "),
}));

vi.mock("@/lib/services/artist-matching", () => ({
  findOrCreateArtist: vi.fn(async (_supabase: unknown, name: string) => ({
    artistId: `artist-${name.toLowerCase().replace(/\s+/g, "-")}`,
    action: "created" as const,
  })),
}));

/**
 * Creates a mock Supabase client where all insert/select chains resolve successfully.
 * Tracks which tables were called with `from()`.
 */
function createMockSupabase() {
  let idCounter = 0;

  // Configurable: set this to make entity_map return a hit
  let entityMapHit: string | null = null;

  function chainProxy(tableName: string, isAfterInsert = false): unknown {
    return new Proxy(
      {},
      {
        get(_target, prop: string) {
          if (prop === "then" || prop === "catch" || prop === "finally")
            return undefined;

          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          return (..._args: unknown[]) => {
            // Terminal methods
            if (prop === "maybeSingle") {
              if (tableName === "scraper_entity_map" && entityMapHit) {
                const hit = entityMapHit;
                entityMapHit = null; // consume
                return Promise.resolve({
                  data: { internal_id: hit },
                  error: null,
                });
              }
              return Promise.resolve({ data: null, error: null });
            }
            if (prop === "single") {
              idCounter++;
              return Promise.resolve({
                data: { id: `mock-id-${idCounter}` },
                error: null,
              });
            }
            // insert starts a chain that should resolve with data on .single()
            if (prop === "insert") {
              return chainProxy(tableName, true);
            }
            // Everything else continues the chain
            return chainProxy(tableName, isAfterInsert);
          };
        },
      }
    );
  }

  const fromCalls: string[] = [];
  const mockFrom = vi.fn((tableName: string) => {
    fromCalls.push(tableName);
    return chainProxy(tableName);
  });
  const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });

  return {
    from: mockFrom,
    rpc: mockRpc,
    fromCalls,
    setEntityMapHit: (id: string) => {
      entityMapHit = id;
    },
  };
}

const { upsertEvent } = await import("./upsert");

describe("upsertEvent", () => {
  const baseEvent: NormalizedEvent = {
    externalId: "edmtrain-event-1",
    name: "Test Event",
    date: "2026-03-20",
    location: "Berlin, Germany",
    artists: [{ externalId: "edmtrain-artist-1", name: "Test Artist" }],
  };

  it("creates new event and returns 'created'", async () => {
    const supabase = createMockSupabase();
    const result = await upsertEvent(supabase as never, "edmtrain", baseEvent);

    expect(result.action).toBe("created");
    expect(result.eventId).toBeTruthy();
    expect(supabase.fromCalls).toContain("scraper_entity_map");
    expect(supabase.fromCalls).toContain("events");
  });

  it("skips when entity_map already has a mapping", async () => {
    const supabase = createMockSupabase();
    supabase.setEntityMapHit("existing-event-id");

    const result = await upsertEvent(supabase as never, "edmtrain", baseEvent);

    expect(result.action).toBe("skipped");
    expect(result.eventId).toBe("existing-event-id");
  });

  it("creates festival when festivalName is provided", async () => {
    const supabase = createMockSupabase();
    const festivalEvent: NormalizedEvent = {
      ...baseEvent,
      festivalName: "Tomorrowland",
    };

    const result = await upsertEvent(
      supabase as never,
      "edmtrain",
      festivalEvent
    );

    expect(result.action).toBe("created");
    expect(supabase.fromCalls).toContain("festivals");
  });

  it("handles event with multiple artists", async () => {
    const supabase = createMockSupabase();
    const multiArtistEvent: NormalizedEvent = {
      ...baseEvent,
      artists: [
        { externalId: "edmtrain-artist-1", name: "Artist A" },
        { externalId: "edmtrain-artist-2", name: "Artist B" },
        { externalId: "edmtrain-artist-3", name: "Artist C" },
      ],
    };

    const result = await upsertEvent(
      supabase as never,
      "edmtrain",
      multiArtistEvent
    );

    expect(result.action).toBe("created");
    // Artist matching is now delegated to findOrCreateArtist (mocked)
    // Verify entity_map calls were made for each artist
    const entityMapCalls = supabase.fromCalls.filter((c) => c === "scraper_entity_map");
    // At least one entity_map lookup per artist + one for the event + mappings
    expect(entityMapCalls.length).toBeGreaterThanOrEqual(4);
  });
});
