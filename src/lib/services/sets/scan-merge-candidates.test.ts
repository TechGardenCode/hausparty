import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecute = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    execute: (...args: unknown[]) => mockExecute(...args),
  },
}));

import { scanMergeCandidates } from "./scan-merge-candidates";

describe("scanMergeCandidates", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns empty result when no pairs are found", async () => {
    mockExecute.mockResolvedValueOnce([]);
    const result = await scanMergeCandidates();
    expect(result.pairs).toEqual([]);
    expect(result.flagged).toBe(0);
    expect(result.scanned).toBe(0);
    expect(result.threshold).toBe(0.75);
    expect(result.dateWindowDays).toBe(7);
    expect(result.dryRun).toBe(false);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("does not run UPDATE statements in dryRun mode", async () => {
    mockExecute.mockResolvedValueOnce([
      { loser_id: "l1", canonical_id: "c1", sim: 0.9 },
      { loser_id: "l2", canonical_id: "c2", sim: 0.8 },
    ]);
    const result = await scanMergeCandidates({ dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.scanned).toBe(2);
    expect(result.flagged).toBe(0);
    expect(result.pairs).toEqual([
      { loserId: "l1", canonicalId: "c1", similarity: 0.9 },
      { loserId: "l2", canonicalId: "c2", similarity: 0.8 },
    ]);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("runs one UPDATE per pair and counts only successful flags", async () => {
    mockExecute
      .mockResolvedValueOnce([
        { loser_id: "l1", canonical_id: "c1", sim: 0.9 },
        { loser_id: "l2", canonical_id: "c2", sim: 0.82 },
      ])
      // l1 updated
      .mockResolvedValueOnce([{ id: "l1" }])
      // l2 already flagged by a racing writer, UPDATE returns 0 rows
      .mockResolvedValueOnce([]);

    const result = await scanMergeCandidates();
    expect(result.scanned).toBe(2);
    expect(result.flagged).toBe(1);
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it("forwards custom threshold + window + limit", async () => {
    mockExecute.mockResolvedValueOnce([]);
    const result = await scanMergeCandidates({
      threshold: 0.6,
      dateWindowDays: 30,
      limit: 100,
    });
    expect(result.threshold).toBe(0.6);
    expect(result.dateWindowDays).toBe(30);
  });

  it("coerces numeric similarity values from strings", async () => {
    mockExecute.mockResolvedValueOnce([
      { loser_id: "l1", canonical_id: "c1", sim: "0.95" },
    ]);
    const result = await scanMergeCandidates({ dryRun: true });
    expect(result.pairs[0].similarity).toBe(0.95);
  });
});
