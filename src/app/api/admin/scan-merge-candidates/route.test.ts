import { describe, it, expect, vi, beforeEach } from "vitest";

const mockScan = vi.fn();
vi.mock("@/lib/services/sets/scan-merge-candidates", () => ({
  scanMergeCandidates: (...args: unknown[]) => mockScan(...args),
}));

import { POST } from "./route";

function makeRequest(body?: unknown, headers?: Record<string, string>) {
  return new Request("http://localhost/api/admin/scan-merge-candidates", {
    method: "POST",
    headers: headers ?? {
      authorization: "Bearer test-key-123",
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("POST /api/admin/scan-merge-candidates", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("ADMIN_API_KEY", "test-key-123");
    mockScan.mockResolvedValue({
      dryRun: false,
      threshold: 0.75,
      dateWindowDays: 7,
      scanned: 0,
      flagged: 0,
      pairs: [],
    });
  });

  it("returns 401 when auth is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/scan-merge-candidates", {
        method: "POST",
      })
    );
    expect(response.status).toBe(401);
  });

  it("returns 401 when ADMIN_API_KEY is not set", async () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(401);
  });

  it("returns 200 with default scan result", async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pairs).toEqual([]);
    expect(mockScan).toHaveBeenCalledWith({
      threshold: undefined,
      dateWindowDays: undefined,
      dryRun: false,
      limit: undefined,
    });
  });

  it("forwards dryRun=true", async () => {
    mockScan.mockResolvedValue({
      dryRun: true,
      threshold: 0.75,
      dateWindowDays: 7,
      scanned: 3,
      flagged: 0,
      pairs: [
        { loserId: "l1", canonicalId: "c1", similarity: 0.9 },
        { loserId: "l2", canonicalId: "c2", similarity: 0.82 },
        { loserId: "l3", canonicalId: "c3", similarity: 0.77 },
      ],
    });
    const response = await POST(makeRequest({ dryRun: true }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.dryRun).toBe(true);
    expect(body.pairs).toHaveLength(3);
    expect(mockScan).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true })
    );
  });

  it("clamps out-of-range threshold to undefined (falls back to default)", async () => {
    await POST(makeRequest({ threshold: 5 }));
    expect(mockScan).toHaveBeenCalledWith(
      expect.objectContaining({ threshold: undefined })
    );
  });

  it("accepts an empty body", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/scan-merge-candidates", {
        method: "POST",
        headers: { authorization: "Bearer test-key-123" },
      })
    );
    expect(response.status).toBe(200);
  });
});
