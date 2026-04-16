import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Scraper, NormalizedEvent } from "./types";

const insertedPayloads: Array<Record<string, unknown>> = [];
const updatedRuns: Array<{ values: Record<string, unknown>; id: string }> = [];
const mockExecute = vi.fn();

function createChainProxy(kind: "insert" | "update"): unknown {
  return new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then" || prop === "catch" || prop === "finally") return undefined;
      return (...args: unknown[]) => {
        if (prop === "values" && kind === "insert") {
          insertedPayloads.push(args[0] as Record<string, unknown>);
          return createChainProxy(kind);
        }
        if (prop === "set" && kind === "update") {
          updatedRuns.push({ values: args[0] as Record<string, unknown>, id: "" });
          return createChainProxy(kind);
        }
        if (prop === "where") return Promise.resolve();
        if (prop === "returning") return Promise.resolve([{ id: "run-id-1" }]);
        return createChainProxy(kind);
      };
    },
    apply() {
      return createChainProxy(kind);
    },
  });
}

const mockDb = {
  insert: () => createChainProxy("insert"),
  update: () => createChainProxy("update"),
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

const mockUpsertEvent = vi.fn();
vi.mock("./upsert", () => ({
  upsertEvent: (...args: unknown[]) => mockUpsertEvent(...args),
}));

const normalizedEvent: NormalizedEvent = {
  externalId: "edmtrain-event-42",
  name: "Replay Event",
  date: "2026-03-15",
  location: "NYC",
  artists: [{ externalId: "edmtrain-artist-1", name: "Test DJ" }],
};

const mockScraper: Scraper = {
  name: "edmtrain",
  fetch: vi.fn(),
  extractRawPayloads: vi.fn(),
  normalize: vi.fn().mockReturnValue(normalizedEvent),
};

vi.mock("./registry", () => ({
  getScraperByName: (name: string) =>
    name === "edmtrain"
      ? { name, description: "test", create: () => mockScraper }
      : undefined,
}));

const { archiveRawPayload, replayFromArchive } = await import("./raw-archive");

describe("archiveRawPayload", () => {
  beforeEach(() => {
    insertedPayloads.length = 0;
    updatedRuns.length = 0;
    mockExecute.mockReset();
    mockUpsertEvent.mockReset();
  });

  it("inserts a row with scraper, entity type, external id, raw json, and run id", async () => {
    await archiveRawPayload({
      scraperName: "edmtrain",
      entityType: "event",
      externalId: "edmtrain-event-42",
      raw: { id: 42, name: "Example" },
      scraperRunId: "run-1",
    });

    expect(insertedPayloads).toHaveLength(1);
    expect(insertedPayloads[0]).toMatchObject({
      scraperName: "edmtrain",
      entityType: "event",
      externalId: "edmtrain-event-42",
      scraperRunId: "run-1",
    });
    expect(insertedPayloads[0].rawJson).toEqual({ id: 42, name: "Example" });
  });

  it("defaults scraperRunId to null when omitted", async () => {
    await archiveRawPayload({
      scraperName: "edmtrain",
      entityType: "artist",
      externalId: "edmtrain-artist-7",
      raw: { id: 7, name: "DJ Seven" },
    });

    expect(insertedPayloads[0].scraperRunId).toBeNull();
  });
});

describe("replayFromArchive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedPayloads.length = 0;
    updatedRuns.length = 0;
    (mockScraper.normalize as ReturnType<typeof vi.fn>).mockReturnValue(normalizedEvent);
  });

  it("normalizes + upserts each archive row for entityType=event", async () => {
    mockExecute.mockResolvedValueOnce([
      { raw_json: { id: 1 } },
      { raw_json: { id: 2 } },
    ]);
    mockUpsertEvent.mockResolvedValue({ action: "created", eventId: "evt-x" });

    const stats = await replayFromArchive({ scraperName: "edmtrain" });

    expect(stats.archiveRowsScanned).toBe(2);
    expect(stats.normalized).toBe(2);
    expect(stats.created).toBe(2);
    expect(mockUpsertEvent).toHaveBeenCalledTimes(2);
  });

  it("counts skipped when normalize returns null", async () => {
    mockExecute.mockResolvedValueOnce([{ raw_json: { id: 1 } }]);
    (mockScraper.normalize as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);

    const stats = await replayFromArchive({ scraperName: "edmtrain" });

    expect(stats.normalized).toBe(0);
    expect(stats.skipped).toBe(1);
    expect(mockUpsertEvent).not.toHaveBeenCalled();
  });

  it("refreshes the search view only when rows were created", async () => {
    mockExecute.mockResolvedValueOnce([{ raw_json: { id: 1 } }]);
    mockUpsertEvent.mockResolvedValue({ action: "updated", eventId: "evt-x" });

    await replayFromArchive({ scraperName: "edmtrain" });

    // execute is called once (archive query) — never a second time for refresh
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("skips normalize for non-event entityType (artists replay no-op for now)", async () => {
    mockExecute.mockResolvedValueOnce([{ raw_json: { id: 1 } }]);

    const stats = await replayFromArchive({
      scraperName: "edmtrain",
      entityType: "artist",
    });

    expect(mockScraper.normalize).not.toHaveBeenCalled();
    expect(stats.archiveRowsScanned).toBe(1);
  });

  it("throws on unknown scraper", async () => {
    await expect(
      replayFromArchive({ scraperName: "unknown-scraper" })
    ).rejects.toThrow(/Unknown scraper/);
  });
});
