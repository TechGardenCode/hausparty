import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next-auth (auth-helpers imports from @/lib/auth which imports next-auth)
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock Drizzle db with chainable proxy
let selectResult: { role: string }[] = [];

function createChainProxy(): unknown {
  return new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === "then" || prop === "catch" || prop === "finally")
        return undefined;
      return (..._args: unknown[]) => {
        if (prop === "limit") {
          return Promise.resolve(selectResult);
        }
        return createChainProxy();
      };
    },
    apply() {
      return createChainProxy();
    },
  });
}

vi.mock("@/lib/db", () => ({
  db: {
    select: () => createChainProxy(),
  },
}));

const { getUserRole, isAdmin, requireAdmin } = await import(
  "@/lib/auth-helpers"
);

describe("getUserRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
  });

  it("returns role from user_roles table", async () => {
    selectResult = [{ role: "site_admin" }];
    const role = await getUserRole("user-123");
    expect(role).toBe("site_admin");
  });

  it("defaults to viewer when no role row exists", async () => {
    selectResult = [];
    const role = await getUserRole("user-456");
    expect(role).toBe("viewer");
  });
});

describe("isAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
  });

  it("returns true for site_admin", async () => {
    selectResult = [{ role: "site_admin" }];
    expect(await isAdmin("admin-user")).toBe(true);
  });

  it("returns false for viewer", async () => {
    selectResult = [{ role: "viewer" }];
    expect(await isAdmin("viewer-user")).toBe(false);
  });

  it("returns false for artist role", async () => {
    selectResult = [{ role: "artist" }];
    expect(await isAdmin("artist-user")).toBe(false);
  });

  it("returns false when no role exists", async () => {
    selectResult = [];
    expect(await isAdmin("no-role-user")).toBe(false);
  });
});

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
  });

  it("returns user id when user is admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-id" } });
    selectResult = [{ role: "site_admin" }];
    const userId = await requireAdmin();
    expect(userId).toBe("admin-id");
  });

  it("throws Unauthorized when no user session", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow("Unauthorized");
  });

  it("throws Forbidden when user is not admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "viewer-id" } });
    selectResult = [{ role: "viewer" }];
    await expect(requireAdmin()).rejects.toThrow("Forbidden");
  });
});
