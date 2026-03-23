import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock admin client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return { single: mockSingle };
          },
        };
      },
    }),
  }),
}));

// Mock server client
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
    }),
}));

import { getUserRole, isAdmin, requireAdmin } from "./auth";

describe("getUserRole", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns role from user_roles table", async () => {
    mockSingle.mockResolvedValue({ data: { role: "site_admin" }, error: null });
    const role = await getUserRole("user-123");
    expect(role).toBe("site_admin");
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-123");
  });

  it("defaults to viewer when no role row exists", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });
    const role = await getUserRole("user-456");
    expect(role).toBe("viewer");
  });

  it("defaults to viewer on error", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });
    const role = await getUserRole("user-789");
    expect(role).toBe("viewer");
  });
});

describe("isAdmin", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns true for site_admin", async () => {
    mockSingle.mockResolvedValue({ data: { role: "site_admin" }, error: null });
    expect(await isAdmin("admin-user")).toBe(true);
  });

  it("returns false for viewer", async () => {
    mockSingle.mockResolvedValue({ data: { role: "viewer" }, error: null });
    expect(await isAdmin("viewer-user")).toBe(false);
  });

  it("returns false for artist role", async () => {
    mockSingle.mockResolvedValue({ data: { role: "artist" }, error: null });
    expect(await isAdmin("artist-user")).toBe(false);
  });

  it("returns false when no role exists", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });
    expect(await isAdmin("no-role-user")).toBe(false);
  });
});

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns user id when user is admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-id" } } });
    mockSingle.mockResolvedValue({ data: { role: "site_admin" }, error: null });
    const userId = await requireAdmin();
    expect(userId).toBe("admin-id");
  });

  it("throws Unauthorized when no user session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(requireAdmin()).rejects.toThrow("Unauthorized");
  });

  it("throws Forbidden when user is not admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "viewer-id" } } });
    mockSingle.mockResolvedValue({ data: { role: "viewer" }, error: null });
    await expect(requireAdmin()).rejects.toThrow("Forbidden");
  });
});
