import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Scraper, NormalizedEvent } from "./types";

// Mock upsert module
const mockUpsertEvent = vi.fn().mockResolvedValue({ action: "created", eventId: "evt-1" });

vi.mock("./upsert", () => ({
  upsertEvent: (...args: unknown[]) => mockUpsertEvent(...args),
}));

// ---- Drizzle db mock for scraper_runs operations ----
const insertedRuns: unknown[] = [];
const updatedRuns: { values: unknown; runId: string }[] = [];
let runIdCounter = 0;
const mockExecute = vi.fn().mockResolvedValue(undefined);

function getTableName(tableObj: unknown): string {
  if (tableObj && typeof tableObj === "object") {
    const sym = Object.getOwnPropertySymbols(tableObj).find((s) =>
      s.toString().includes("Name")
    );
    if (sym) return String((tableObj as Record<symbol, unknown>)[sym]);
  }
  return "unknown";
}

function createChainProxy(context: { tableName: string }): unknown {
  return new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === "then" || prop === "catch" || prop === "finally") return undefined;
      return (...args: unknown[]) => {
        if (prop === "values") {
          insertedRuns.push(args[0]);
          return createChainProxy(context);
        }
        if (prop === "returning") {
          runIdCounter++;
          return Promise.resolve([{ id: `run-id-${runIdCounter}` }]);
        }
        if (prop === "set") {
          // Track the update values — store for assertion
          updatedRuns.push({ values: args[0], runId: "" });
          return createChainProxy(context);
        }
        if (prop === "where") {
          // Terminal for update chain
          return Promise.resolve();
        }
        return createChainProxy(context);
      };
    },
    apply() {
      return createChainProxy(context);
    },
  });
}

const mockDb = {
  insert: (tableObj: unknown) => {
    const tableName = getTableName(tableObj);
    return createChainProxy({ tableName });
  },
  update: (tableObj: unknown) => {
    const tableName = getTableName(tableObj);
    return createChainProxy({ tableName });
  },
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

const { ScraperRunner } = await import("./runner");

describe("ScraperRunner", () => {
  const normalizedEvent: NormalizedEvent = {
    externalId: "test-1",
    name: "Test Event",
    date: "2026-03-20",
    location: "Berlin",
    artists: [{ externalId: "a-1", name: "Test DJ" }],
  };

  const mockScraper: Scraper = {
    name: "test-scraper",
    fetch: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
    normalize: vi.fn().mockReturnValue(normalizedEvent),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    insertedRuns.length = 0;
    updatedRuns.length = 0;
    runIdCounter = 0;
    mockExecute.mockResolvedValue(undefined);
    mockUpsertEvent.mockResolvedValue({ action: "created", eventId: "evt-1" });
    (mockScraper.fetch as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }, { id: 2 }]);
    (mockScraper.normalize as ReturnType<typeof vi.fn>).mockReturnValue(normalizedEvent);
  });

  it("creates a scraper_runs entry and returns stats", async () => {
    const runner = new ScraperRunner();
    const result = await runner.run(mockScraper, { startDate: "2026-03-20" });

    expect(result.runId).toBe("run-id-1");
    expect(result.stats.fetched).toBe(2);
    expect(result.stats.created).toBe(2);
    expect(result.stats.errors).toBe(0);
  });

  it("calls fetch and normalize for each item", async () => {
    const runner = new ScraperRunner();
    await runner.run(mockScraper, {});

    expect(mockScraper.fetch).toHaveBeenCalledOnce();
    expect(mockScraper.normalize).toHaveBeenCalledTimes(2);
  });

  it("skips items that normalize to null", async () => {
    (mockScraper.normalize as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(normalizedEvent);

    const runner = new ScraperRunner();
    const result = await runner.run(mockScraper, {});

    expect(result.stats.skipped).toBe(1);
    expect(result.stats.created).toBe(1);
  });

  it("counts errors per item without aborting", async () => {
    mockUpsertEvent
      .mockRejectedValueOnce(new Error("DB error"))
      .mockResolvedValueOnce({ action: "created", eventId: "evt-2" });

    const runner = new ScraperRunner();
    const result = await runner.run(mockScraper, {});

    expect(result.stats.errors).toBe(1);
    expect(result.stats.created).toBe(1);
  });

  it("refreshes search view when entities are created", async () => {
    const runner = new ScraperRunner();
    await runner.run(mockScraper, {});

    expect(mockExecute).toHaveBeenCalledOnce();
  });

  it("does not refresh search view when nothing was created", async () => {
    mockUpsertEvent.mockResolvedValue({ action: "skipped", eventId: "evt-1" });

    const runner = new ScraperRunner();
    await runner.run(mockScraper, {});

    expect(mockExecute).not.toHaveBeenCalled();
  });
});
