import { describe, it, expect, vi, beforeEach } from "vitest";

const mockProcessPendingSubmissions = vi.fn();
vi.mock("@/lib/services/submission-processor", () => ({
  processPendingSubmissions: (...args: unknown[]) =>
    mockProcessPendingSubmissions(...args),
}));

import { POST } from "./route";

describe("POST /api/admin/process-submissions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("ADMIN_API_KEY", "test-key-123");
  });

  it("returns 401 when no authorization header", async () => {
    const request = new Request(
      "http://localhost/api/admin/process-submissions",
      { method: "POST" }
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when authorization header is wrong", async () => {
    const request = new Request(
      "http://localhost/api/admin/process-submissions",
      {
        method: "POST",
        headers: { authorization: "Bearer wrong-key" },
      }
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 401 when ADMIN_API_KEY is not set", async () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    const request = new Request(
      "http://localhost/api/admin/process-submissions",
      {
        method: "POST",
        headers: { authorization: "Bearer test-key-123" },
      }
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns processor results on success", async () => {
    mockProcessPendingSubmissions.mockResolvedValue({
      processed: 2,
      results: [
        { submissionId: "s1", status: "approved", setId: "set-1" },
        { submissionId: "s2", status: "rejected", reason: "Duplicate URL" },
      ],
    });

    const request = new Request(
      "http://localhost/api/admin/process-submissions",
      {
        method: "POST",
        headers: { authorization: "Bearer test-key-123" },
      }
    );
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(2);
    expect(body.results).toHaveLength(2);
    expect(mockProcessPendingSubmissions).toHaveBeenCalledOnce();
  });

  it("returns empty results when no pending submissions", async () => {
    mockProcessPendingSubmissions.mockResolvedValue({
      processed: 0,
      results: [],
    });

    const request = new Request(
      "http://localhost/api/admin/process-submissions",
      {
        method: "POST",
        headers: { authorization: "Bearer test-key-123" },
      }
    );
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(0);
    expect(body.results).toEqual([]);
  });
});
