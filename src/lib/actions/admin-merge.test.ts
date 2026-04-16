import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth-helpers", () => ({
  requireAdmin: vi.fn().mockResolvedValue("admin-user-id"),
}));

const selectQueue: unknown[][] = [];
const executeQueue: unknown[][] = [];

function makeSelectChain(): unknown {
  return new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then" || prop === "catch" || prop === "finally") return undefined;
      return (..._args: unknown[]) => {
        if (prop === "limit") {
          return Promise.resolve(selectQueue.shift() ?? []);
        }
        return makeSelectChain();
      };
    },
    apply() {
      return makeSelectChain();
    },
  });
}

const mockExecute = vi.fn();
const mockTransaction = vi.fn();

const mockDb = {
  select: () => makeSelectChain(),
  execute: mockExecute,
  transaction: mockTransaction,
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

// Helpers wired via executeQueue — consumed in the same order loadPreview calls them.
function queueExecute(rows: unknown[]) {
  executeQueue.push(rows);
}

// Common fixture: a valid "from" set (draft with 2 sources etc.) and valid "into" (published)
function queueSetSummary(label: "from" | "into", status: string) {
  selectQueue.push([
    {
      id: label === "from" ? "set-from" : "set-into",
      title: label === "from" ? "From Set" : "Into Set",
      slug: label === "from" ? "from-slug" : "into-slug",
      status,
    },
  ]);
  queueExecute([
    {
      sources: "2",
      artists: "1",
      saves: "3",
      collection_memberships: "1",
      tracklist: "0",
    },
  ]);
}

const { previewMerge, mergeSet } = await import("./admin-merge");

describe("previewMerge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue.length = 0;
    executeQueue.length = 0;
    mockExecute.mockImplementation(() => {
      return Promise.resolve(executeQueue.shift() ?? []);
    });
  });

  it("returns both summaries and willMove counts on a clean preview", async () => {
    queueSetSummary("from", "draft");
    queueSetSummary("into", "published");
    // willMove computations: source_collisions, new_artists, new_saves, new_collections
    queueExecute([{ count: "1" }]); // 1 source URL collision
    queueExecute([{ count: "1" }]); // 1 new artist
    queueExecute([{ count: "2" }]); // 2 new saves
    queueExecute([{ count: "0" }]); // 0 new collection memberships

    const preview = await previewMerge("set-from", "set-into");

    expect(preview.blockers).toEqual([]);
    expect(preview.from.title).toBe("From Set");
    expect(preview.into.title).toBe("Into Set");
    expect(preview.willMove.sources).toBe(1); // 2 from sources - 1 collision
    expect(preview.willMove.sourceUrlCollisions).toBe(1);
    expect(preview.willMove.artists).toBe(1);
    expect(preview.willMove.saves).toBe(2);
    expect(preview.willMove.tracklistDropped).toBe(0);
  });

  it("reports self-merge as a blocker", async () => {
    queueSetSummary("from", "draft");
    // Called twice but second Summary is identical — doesn't matter, blocker catches first
    queueSetSummary("into", "draft");
    queueExecute([{ count: "0" }]);
    queueExecute([{ count: "0" }]);
    queueExecute([{ count: "0" }]);
    queueExecute([{ count: "0" }]);

    const preview = await previewMerge("same-id", "same-id");

    expect(preview.blockers).toContain("cannot merge a set into itself");
  });

  it("reports already-merged source as a blocker", async () => {
    queueSetSummary("from", "merged");
    queueSetSummary("into", "published");
    queueExecute([{ count: "0" }]);
    queueExecute([{ count: "0" }]);
    queueExecute([{ count: "0" }]);
    queueExecute([{ count: "0" }]);

    const preview = await previewMerge("set-from", "set-into");

    expect(preview.blockers.some((b) => b.includes("source set is already merged"))).toBe(true);
  });

  it("reports missing source set as a blocker", async () => {
    selectQueue.push([]); // from summary miss
    queueSetSummary("into", "published");

    const preview = await previewMerge("ghost", "set-into");

    expect(preview.blockers.some((b) => b.includes("not found"))).toBe(true);
  });
});

describe("mergeSet guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue.length = 0;
    executeQueue.length = 0;
    mockTransaction.mockReset();
    mockExecute.mockImplementation(() => {
      return Promise.resolve(executeQueue.shift() ?? []);
    });
  });

  it("rejects when the preview reports any blocker", async () => {
    selectQueue.push([]); // from not found
    queueSetSummary("into", "published");

    await expect(mergeSet("ghost", "set-into")).rejects.toThrow(/Merge blocked/);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects self-merge without entering the transaction", async () => {
    queueSetSummary("from", "draft");
    queueSetSummary("into", "draft");
    queueExecute([{ count: "0" }]);
    queueExecute([{ count: "0" }]);
    queueExecute([{ count: "0" }]);
    queueExecute([{ count: "0" }]);

    await expect(mergeSet("same-id", "same-id")).rejects.toThrow(
      /cannot merge a set into itself/
    );
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
