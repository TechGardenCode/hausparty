import { describe, it, expect, vi } from "vitest";
import { matchArtist, findOrCreateArtist } from "./artist-matching";

vi.mock("@/lib/utils", () => ({
  slugify: (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({}),
}));

/**
 * Creates a mock Supabase client using a Proxy-based chain.
 * Configurable responses for each tier of the matching pipeline.
 */
function createMockSupabase(config: {
  slugMatch?: { id: string } | null;
  aliasArtists?: { id: string; aliases: string[] | null }[];
  fuzzyMatches?: { artist_id: string; artist_name: string; sim: number }[] | null;
  insertResult?: { id: string } | null;
  insertError?: { message: string } | null;
}) {
  let callCount = 0;
  const rpcFn = vi.fn();

  function chainProxy(tableName: string, isInsert = false): unknown {
    return new Proxy(
      {},
      {
        get(_target, prop: string) {
          if (prop === "then" || prop === "catch" || prop === "finally")
            return undefined;

          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          return (..._args: unknown[]) => {
            if (prop === "maybeSingle") {
              if (tableName === "artists" && callCount === 0) {
                callCount++;
                return Promise.resolve({
                  data: config.slugMatch ?? null,
                  error: null,
                });
              }
              return Promise.resolve({ data: null, error: null });
            }

            // .not() for alias query — returns the response directly (awaitable)
            if (prop === "not") {
              return Promise.resolve({
                data: config.aliasArtists ?? [],
                error: null,
              });
            }

            if (prop === "single") {
              if (isInsert) {
                return Promise.resolve({
                  data: config.insertResult ?? { id: "new-id" },
                  error: config.insertError ?? null,
                });
              }
              return Promise.resolve({ data: { id: "new-id" }, error: null });
            }

            if (prop === "insert") {
              return chainProxy(tableName, true);
            }

            return chainProxy(tableName, isInsert);
          };
        },
      }
    );
  }

  const fromFn = vi.fn((tableName: string) => chainProxy(tableName));

  rpcFn.mockImplementation(() =>
    Promise.resolve({
      data: config.fuzzyMatches ?? [],
      error: null,
    })
  );

  return { from: fromFn, rpc: rpcFn };
}

describe("matchArtist", () => {
  it("returns exact match on slug (tier 1)", async () => {
    const mock = createMockSupabase({
      slugMatch: { id: "artist-1" },
    });

    const result = await matchArtist(mock as never, "Charlotte de Witte");

    expect(result).toEqual({ artistId: "artist-1", confidence: "exact" });
  });

  it("returns alias match when slug fails (tier 2)", async () => {
    const mock = createMockSupabase({
      slugMatch: null,
      aliasArtists: [
        { id: "artist-2", aliases: ["CdW", "CDW"] },
        { id: "artist-3", aliases: ["Other"] },
      ],
    });

    const result = await matchArtist(mock as never, "CdW");

    expect(result).toEqual({ artistId: "artist-2", confidence: "alias" });
  });

  it("alias match is case-insensitive", async () => {
    const mock = createMockSupabase({
      slugMatch: null,
      aliasArtists: [
        { id: "artist-2", aliases: ["Charlotte De Witte"] },
      ],
    });

    const result = await matchArtist(mock as never, "charlotte de witte");

    expect(result).toEqual({ artistId: "artist-2", confidence: "alias" });
  });

  it("returns fuzzy match when slug and alias fail (tier 3)", async () => {
    const mock = createMockSupabase({
      slugMatch: null,
      aliasArtists: [],
      fuzzyMatches: [
        { artist_id: "artist-4", artist_name: "Charlotte de Witte", sim: 0.91 },
      ],
    });

    const result = await matchArtist(mock as never, "Charlote de Witte");

    expect(result).toEqual({
      artistId: "artist-4",
      confidence: "fuzzy",
      similarity: 0.91,
    });
  });

  it("returns null when no match at any tier", async () => {
    const mock = createMockSupabase({
      slugMatch: null,
      aliasArtists: [],
      fuzzyMatches: [],
    });

    const result = await matchArtist(mock as never, "Completely Unknown");

    expect(result).toBeNull();
  });

  it("skips artists with null aliases in tier 2", async () => {
    const mock = createMockSupabase({
      slugMatch: null,
      aliasArtists: [
        { id: "artist-5", aliases: null },
      ],
      fuzzyMatches: [],
    });

    const result = await matchArtist(mock as never, "SomeName");

    expect(result).toBeNull();
  });
});

describe("findOrCreateArtist", () => {
  it("returns matched for exact slug match", async () => {
    const mock = createMockSupabase({
      slugMatch: { id: "artist-1" },
    });

    const result = await findOrCreateArtist(mock as never, "Charlotte de Witte");

    expect(result).toEqual({ artistId: "artist-1", action: "matched" });
  });

  it("returns matched for alias match", async () => {
    const mock = createMockSupabase({
      slugMatch: null,
      aliasArtists: [{ id: "artist-2", aliases: ["CdW"] }],
    });

    const result = await findOrCreateArtist(mock as never, "CdW");

    expect(result).toEqual({ artistId: "artist-2", action: "matched" });
  });

  it("returns matched for high-confidence fuzzy match (>= 0.85)", async () => {
    const mock = createMockSupabase({
      slugMatch: null,
      aliasArtists: [],
      fuzzyMatches: [
        { artist_id: "artist-3", artist_name: "Charlotte de Witte", sim: 0.92 },
      ],
    });

    const result = await findOrCreateArtist(mock as never, "Charlotte De Witte");

    expect(result).toEqual({ artistId: "artist-3", action: "matched" });
  });

  it("creates new artist for low-confidence fuzzy match (< 0.85)", async () => {
    const mock = createMockSupabase({
      slugMatch: null,
      aliasArtists: [],
      fuzzyMatches: [
        { artist_id: "artist-3", artist_name: "Charlotte de Witte", sim: 0.72 },
      ],
      insertResult: { id: "new-artist-1" },
    });

    const result = await findOrCreateArtist(mock as never, "Charlotte Witte");

    expect(result).toEqual({ artistId: "new-artist-1", action: "created" });
  });

  it("creates new artist when no match found", async () => {
    const mock = createMockSupabase({
      slugMatch: null,
      aliasArtists: [],
      fuzzyMatches: [],
      insertResult: { id: "new-artist-2" },
    });

    const result = await findOrCreateArtist(mock as never, "Brand New Artist");

    expect(result).toEqual({ artistId: "new-artist-2", action: "created" });
  });
});
