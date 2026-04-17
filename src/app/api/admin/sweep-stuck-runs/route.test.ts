import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecute = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    execute: (...args: unknown[]) => mockExecute(...args),
  },
}));

import { POST } from "./route";

describe("POST /api/admin/sweep-stuck-runs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("ADMIN_API_KEY", "test-key-123");
  });

  it("returns 401 when authorization header is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/sweep-stuck-runs", {
        method: "POST",
      })
    );
    expect(response.status).toBe(401);
  });

  it("returns 401 when ADMIN_API_KEY is not set", async () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    const response = await POST(
      new Request("http://localhost/api/admin/sweep-stuck-runs", {
        method: "POST",
        headers: { authorization: "Bearer test-key-123" },
      })
    );
    expect(response.status).toBe(401);
  });

  it("returns empty swept list when no stuck runs exist", async () => {
    mockExecute.mockResolvedValue([]);
    const response = await POST(
      new Request("http://localhost/api/admin/sweep-stuck-runs", {
        method: "POST",
        headers: { authorization: "Bearer test-key-123" },
      })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.swept).toEqual([]);
    expect(body.thresholdMinutes).toBe(60);
  });

  it("returns swept runs with ISO-serialized timestamps", async () => {
    const startedAt = new Date("2026-04-16T00:00:00.000Z");
    mockExecute.mockResolvedValue([
      { id: "run-1", scraperName: "edmtrain", startedAt },
    ]);
    const response = await POST(
      new Request("http://localhost/api/admin/sweep-stuck-runs", {
        method: "POST",
        headers: { authorization: "Bearer test-key-123" },
      })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.swept).toEqual([
      {
        id: "run-1",
        scraperName: "edmtrain",
        startedAt: "2026-04-16T00:00:00.000Z",
      },
    ]);
  });
});
