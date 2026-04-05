import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/utils", () => ({
  slugify: (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
}));

// ---- Drizzle db mock ----

let slugMatchResult: { id: string }[] = [];
let aliasRows: { id: string; aliases: string[] | null }[] = [];
let fuzzyResult: { artist_id: string; artist_name: string; sim: number }[] = [];
let insertReturnValue: { id: string } = { id: "new-id" };

let selectCallCount = 0;

function createChainProxy(): unknown {
  return new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === "then" || prop === "catch" || prop === "finally")
        return undefined;
      return (..._args: unknown[]) => {
        // Terminal: .limit() — resolve the select chain
        if (prop === "limit") {
          selectCallCount++;
          if (selectCallCount === 1) {
            // Tier 1: slug match
            return Promise.resolve(slugMatchResult);
          }
          return Promise.resolve([]);
        }
        // .where() with ne() (tier 2 alias query) — resolve directly
        if (prop === "where") {
          // Check if this is the tier 2 call (selectCallCount === 1 means tier 1 .limit already resolved)
          // The alias query doesn't have .limit(), so we resolve it here
          // But we need to distinguish tier 1 (has .limit) from tier 2 (doesn't)
          // Tier 2 where returns a thenable that resolves to aliasRows
          const result = createChainProxy();
          // Make this thenable too for the case where .where is terminal
          return new Proxy(result as object, {
            get(target, innerProp) {
              if (innerProp === "then") {
                // This is tier 2's terminal — resolve with aliasRows
                return (resolve: (v: unknown) => void) =>
                  resolve(aliasRows);
              }
              if (innerProp === "catch" || innerProp === "finally")
                return undefined;
              // Not terminal, continue chain
              return (target as Record<string, unknown>)[innerProp];
            },
          });
        }
        // Terminal: .returning() — resolve an insert
        if (prop === "returning") {
          return Promise.resolve([insertReturnValue]);
        }
        return createChainProxy();
      };
    },
    apply() {
      return createChainProxy();
    },
  });
}

const mockExecute = vi.fn();

const mockDb = {
  select: (..._args: unknown[]) => createChainProxy(),
  insert: (_tableObj: unknown) => createChainProxy(),
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

const { matchArtist, findOrCreateArtist } = await import(
  "./artist-matching"
);

describe("matchArtist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
    slugMatchResult = [];
    aliasRows = [];
    fuzzyResult = [];
    mockExecute.mockImplementation(() => Promise.resolve(fuzzyResult));
  });

  it("returns exact match on slug (tier 1)", async () => {
    slugMatchResult = [{ id: "artist-1" }];

    const result = await matchArtist("Charlotte de Witte");

    expect(result).toEqual({ artistId: "artist-1", confidence: "exact" });
  });

  it("returns alias match when slug fails (tier 2)", async () => {
    slugMatchResult = [];
    aliasRows = [
      { id: "artist-2", aliases: ["CdW", "CDW"] },
      { id: "artist-3", aliases: ["Other"] },
    ];

    const result = await matchArtist("CdW");

    expect(result).toEqual({ artistId: "artist-2", confidence: "alias" });
  });

  it("alias match is case-insensitive", async () => {
    slugMatchResult = [];
    aliasRows = [{ id: "artist-2", aliases: ["Charlotte De Witte"] }];

    const result = await matchArtist("charlotte de witte");

    expect(result).toEqual({ artistId: "artist-2", confidence: "alias" });
  });

  it("returns fuzzy match when slug and alias fail (tier 3)", async () => {
    slugMatchResult = [];
    aliasRows = [];
    fuzzyResult = [
      {
        artist_id: "artist-4",
        artist_name: "Charlotte de Witte",
        sim: 0.91,
      },
    ];
    mockExecute.mockResolvedValue(fuzzyResult);

    const result = await matchArtist("Charlote de Witte");

    expect(result).toEqual({
      artistId: "artist-4",
      confidence: "fuzzy",
      similarity: 0.91,
    });
  });

  it("returns null when no match at any tier", async () => {
    slugMatchResult = [];
    aliasRows = [];
    fuzzyResult = [];
    mockExecute.mockResolvedValue([]);

    const result = await matchArtist("Completely Unknown");

    expect(result).toBeNull();
  });

  it("skips artists with null aliases in tier 2", async () => {
    slugMatchResult = [];
    aliasRows = [{ id: "artist-5", aliases: null }];
    fuzzyResult = [];
    mockExecute.mockResolvedValue([]);

    const result = await matchArtist("SomeName");

    expect(result).toBeNull();
  });
});

describe("findOrCreateArtist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
    slugMatchResult = [];
    aliasRows = [];
    fuzzyResult = [];
    insertReturnValue = { id: "new-id" };
    mockExecute.mockImplementation(() => Promise.resolve(fuzzyResult));
  });

  it("returns matched for exact slug match", async () => {
    slugMatchResult = [{ id: "artist-1" }];

    const result = await findOrCreateArtist("Charlotte de Witte");

    expect(result).toEqual({ artistId: "artist-1", action: "matched" });
  });

  it("returns matched for alias match", async () => {
    slugMatchResult = [];
    aliasRows = [{ id: "artist-2", aliases: ["CdW"] }];

    const result = await findOrCreateArtist("CdW");

    expect(result).toEqual({ artistId: "artist-2", action: "matched" });
  });

  it("returns matched for high-confidence fuzzy match (>= 0.85)", async () => {
    slugMatchResult = [];
    aliasRows = [];
    fuzzyResult = [
      {
        artist_id: "artist-3",
        artist_name: "Charlotte de Witte",
        sim: 0.92,
      },
    ];
    mockExecute.mockResolvedValue(fuzzyResult);

    const result = await findOrCreateArtist("Charlotte De Witte");

    expect(result).toEqual({ artistId: "artist-3", action: "matched" });
  });

  it("creates new artist for low-confidence fuzzy match (< 0.85)", async () => {
    slugMatchResult = [];
    aliasRows = [];
    fuzzyResult = [
      {
        artist_id: "artist-3",
        artist_name: "Charlotte de Witte",
        sim: 0.72,
      },
    ];
    mockExecute.mockResolvedValue(fuzzyResult);
    insertReturnValue = { id: "new-artist-1" };

    const result = await findOrCreateArtist("Charlotte Witte");

    expect(result).toEqual({ artistId: "new-artist-1", action: "created" });
  });

  it("creates new artist when no match found", async () => {
    slugMatchResult = [];
    aliasRows = [];
    fuzzyResult = [];
    mockExecute.mockResolvedValue([]);
    insertReturnValue = { id: "new-artist-2" };

    const result = await findOrCreateArtist("Brand New Artist");

    expect(result).toEqual({ artistId: "new-artist-2", action: "created" });
  });
});
