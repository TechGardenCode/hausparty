import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLimit = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: (...args: unknown[]) => mockLimit(...args),
        }),
      }),
    }),
  },
}));

import { getInFlightRun, ScraperInFlightError } from "./in-flight";

describe("getInFlightRun", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns null when no running row exists", async () => {
    mockLimit.mockResolvedValue([]);
    expect(await getInFlightRun("edmtrain")).toBeNull();
  });

  it("returns the first running row when one exists", async () => {
    const startedAt = new Date("2026-04-16T00:00:00.000Z");
    mockLimit.mockResolvedValue([{ id: "run-1", startedAt }]);
    const result = await getInFlightRun("edmtrain");
    expect(result).toEqual({ id: "run-1", startedAt });
  });
});

describe("ScraperInFlightError", () => {
  it("carries the scraper name, runId, and startedAt", () => {
    const startedAt = new Date("2026-04-16T00:00:00.000Z");
    const err = new ScraperInFlightError("edmtrain", "run-1", startedAt);
    expect(err.name).toBe("ScraperInFlightError");
    expect(err.scraperName).toBe("edmtrain");
    expect(err.runId).toBe("run-1");
    expect(err.startedAt).toBe(startedAt);
    expect(err.message).toContain("edmtrain");
    expect(err.message).toContain("run-1");
  });
});
