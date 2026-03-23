import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the admin client before importing the route
const mockRpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: mockRpc,
  }),
}));

import { POST } from "./route";

describe("POST /api/admin/refresh-search", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("ADMIN_API_KEY", "test-key-123");
  });

  it("returns 401 when no authorization header", async () => {
    const request = new Request("http://localhost/api/admin/refresh-search", {
      method: "POST",
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when authorization header is wrong", async () => {
    const request = new Request("http://localhost/api/admin/refresh-search", {
      method: "POST",
      headers: { authorization: "Bearer wrong-key" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 401 when ADMIN_API_KEY is not set", async () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    const request = new Request("http://localhost/api/admin/refresh-search", {
      method: "POST",
      headers: { authorization: "Bearer test-key-123" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 200 with refreshed status on success", async () => {
    mockRpc.mockResolvedValue({ error: null });
    const request = new Request("http://localhost/api/admin/refresh-search", {
      method: "POST",
      headers: { authorization: "Bearer test-key-123" },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.refreshed).toBe(true);
    expect(body.timestamp).toBeDefined();
    expect(mockRpc).toHaveBeenCalledWith("refresh_search_view");
  });

  it("returns 500 when RPC fails", async () => {
    mockRpc.mockResolvedValue({ error: { message: "View refresh failed" } });
    const request = new Request("http://localhost/api/admin/refresh-search", {
      method: "POST",
      headers: { authorization: "Bearer test-key-123" },
    });
    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("View refresh failed");
  });
});
