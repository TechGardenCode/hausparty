import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Scraper, NormalizedEvent } from "./types";

// Mock upsert module
vi.mock("./upsert", () => ({
  upsertEvent: vi.fn().mockResolvedValue({ action: "created", eventId: "evt-1" }),
}));

// Mock admin client
const mockInsertChain = {
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: "run-id-1" }, error: null }),
};
const mockUpdateChain = {
  eq: vi.fn().mockResolvedValue({ data: null, error: null }),
};

const mockFrom = vi.fn().mockImplementation((table: string) => {
  if (table === "scraper_runs") {
    return {
      insert: vi.fn().mockReturnValue(mockInsertChain),
      update: vi.fn().mockReturnValue(mockUpdateChain),
    };
  }
  return {};
});

const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom, rpc: mockRpc }),
}));

const { ScraperRunner } = await import("./runner");
const { upsertEvent } = await import("./upsert");

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
    // Re-setup default mocks after clear
    mockInsertChain.select.mockReturnThis();
    mockInsertChain.single.mockResolvedValue({ data: { id: "run-id-1" }, error: null });
    mockUpdateChain.eq.mockResolvedValue({ data: null, error: null });
    (mockScraper.fetch as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }, { id: 2 }]);
    (mockScraper.normalize as ReturnType<typeof vi.fn>).mockReturnValue(normalizedEvent);
    (upsertEvent as ReturnType<typeof vi.fn>).mockResolvedValue({ action: "created", eventId: "evt-1" });
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
    (upsertEvent as ReturnType<typeof vi.fn>)
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

    expect(mockRpc).toHaveBeenCalledWith("refresh_search_view");
  });

  it("does not refresh search view when nothing was created", async () => {
    (upsertEvent as ReturnType<typeof vi.fn>).mockResolvedValue({ action: "skipped", eventId: "evt-1" });

    const runner = new ScraperRunner();
    await runner.run(mockScraper, {});

    expect(mockRpc).not.toHaveBeenCalled();
  });
});
