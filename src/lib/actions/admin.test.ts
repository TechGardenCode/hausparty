import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next-auth (auth-helpers → @/lib/auth → next-auth)
vi.mock("@/lib/auth", () => ({
  auth: () => Promise.resolve({ user: { id: "admin-user-id" } }),
}));

// Mock revalidatePath
const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

// Mock slugify
vi.mock("@/lib/utils", () => ({
  slugify: (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
  getYouTubeThumbnail: () => null,
}));

// Mock processSubmission
const mockProcessSubmission = vi.fn();
vi.mock("@/lib/services/submission-processor", () => ({
  processSubmission: (...args: unknown[]) => mockProcessSubmission(...args),
}));

// Mock admin queries (imported by admin.ts)
vi.mock("@/lib/queries/admin", () => ({
  searchArtists: vi.fn(),
  searchEvents: vi.fn(),
  searchFestivals: vi.fn(),
  getGenreSuggestionsForArtists: vi.fn(),
}));

// ---- Drizzle db mock ----
// Track all operations for assertion
const ops: { method: string; args: unknown[] }[] = [];
const mockExecute = vi.fn().mockResolvedValue(undefined);

// getUserRole needs to return site_admin for requireAdmin to pass
let userRoleResult: { role: string }[] = [{ role: "site_admin" }];
let insertReturnValue = [{ id: "new-id", name: "Test", slug: "test" }];
let selectCount = 0;

function createChainProxy(op: string): unknown {
  return new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === "then" || prop === "catch" || prop === "finally")
        return undefined;
      return (...args: unknown[]) => {
        ops.push({ method: String(prop), args });
        // Terminal methods
        if (prop === "limit") {
          selectCount++;
          // First select is getUserRole from requireAdmin
          return Promise.resolve(userRoleResult);
        }
        if (prop === "returning") {
          return Promise.resolve(insertReturnValue);
        }
        if (prop === "where" && op === "update") {
          return Promise.resolve(undefined);
        }
        if (prop === "where" && op === "delete") {
          return Promise.resolve(undefined);
        }
        if (prop === "onConflictDoNothing") {
          return Promise.resolve(undefined);
        }
        return createChainProxy(op);
      };
    },
    apply() {
      return createChainProxy(op);
    },
  });
}

vi.mock("@/lib/db", () => ({
  db: new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "execute") return mockExecute;
        if (prop === "select") return () => createChainProxy("select");
        if (prop === "insert") return () => createChainProxy("insert");
        if (prop === "update") return () => createChainProxy("update");
        if (prop === "delete") return () => createChainProxy("delete");
        return undefined;
      },
    }
  ),
}));

const {
  approveSubmission,
  rejectSubmission,
  reprocessSubmission,
  updateSet,
  updateSetArtists,
  updateSetGenres,
  createEvent,
  createGenre,
  createArtist,
  bulkAssignGenre,
  refreshSearchIndex,
} = await import("./admin");

describe("approveSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ops.length = 0;
    selectCount = 0;
    userRoleResult = [{ role: "site_admin" }];
    mockProcessSubmission.mockReset();
  });

  it("calls processSubmission with submission id", async () => {
    mockProcessSubmission.mockResolvedValue({ status: "approved" });
    await approveSubmission("sub-1");
    expect(mockProcessSubmission).toHaveBeenCalledWith("sub-1");
  });

  it("refreshes search view when approved", async () => {
    mockProcessSubmission.mockResolvedValue({ status: "approved" });
    await approveSubmission("sub-1");
    expect(mockExecute).toHaveBeenCalled();
  });

  it("does not refresh search view when not approved", async () => {
    mockProcessSubmission.mockResolvedValue({
      status: "rejected",
      reason: "duplicate",
    });
    await approveSubmission("sub-2");
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("revalidates submissions path", async () => {
    mockProcessSubmission.mockResolvedValue({ status: "approved" });
    await approveSubmission("sub-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/submissions");
  });
});

describe("rejectSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ops.length = 0;
    selectCount = 0;
    userRoleResult = [{ role: "site_admin" }];
  });

  it("revalidates submissions path", async () => {
    await rejectSubmission("sub-1", "Duplicate content");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/submissions");
  });
});

describe("reprocessSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ops.length = 0;
    selectCount = 0;
    userRoleResult = [{ role: "site_admin" }];
    mockProcessSubmission.mockReset();
  });

  it("calls processSubmission after reset", async () => {
    mockProcessSubmission.mockResolvedValue({ status: "approved" });
    await reprocessSubmission("sub-1");
    expect(mockProcessSubmission).toHaveBeenCalledWith("sub-1");
  });

  it("refreshes search view when reprocess approves", async () => {
    mockProcessSubmission.mockResolvedValue({ status: "approved" });
    await reprocessSubmission("sub-1");
    expect(mockExecute).toHaveBeenCalled();
  });

  it("revalidates submissions path", async () => {
    mockProcessSubmission.mockResolvedValue({ status: "rejected" });
    await reprocessSubmission("sub-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/submissions");
  });
});

describe("updateSet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ops.length = 0;
    selectCount = 0;
    userRoleResult = [{ role: "site_admin" }];
  });

  it("revalidates admin sets paths", async () => {
    await updateSet("set-1", { title: "X" });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/sets");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/sets/set-1/edit");
  });
});

describe("updateSetArtists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ops.length = 0;
    selectCount = 0;
    userRoleResult = [{ role: "site_admin" }];
  });

  it("completes without error", async () => {
    await expect(
      updateSetArtists("set-1", [
        { id: "a-1", position: 0 },
        { id: "a-2", position: 1 },
      ])
    ).resolves.toBeUndefined();
  });
});

describe("updateSetGenres", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ops.length = 0;
    selectCount = 0;
    userRoleResult = [{ role: "site_admin" }];
  });

  it("completes without error", async () => {
    await expect(updateSetGenres("set-1", ["g-1", "g-2"])).resolves.toBeUndefined();
  });
});

describe("createEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ops.length = 0;
    selectCount = 0;
    userRoleResult = [{ role: "site_admin" }];
    insertReturnValue = [{ id: "new-id", name: "Ultra 2026", slug: "ultra-2026" }];
  });

  it("returns the created event", async () => {
    const result = await createEvent({ name: "Ultra 2026", date_start: "2026-03-20" });
    expect(result).toEqual({ id: "new-id", name: "Ultra 2026", slug: "ultra-2026" });
  });
});

describe("createGenre", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ops.length = 0;
    selectCount = 0;
    userRoleResult = [{ role: "site_admin" }];
    insertReturnValue = [{ id: "new-id", name: "Deep House", slug: "deep-house" }];
  });

  it("returns the created genre", async () => {
    const result = await createGenre("Deep House");
    expect(result).toEqual({ id: "new-id", name: "Deep House", slug: "deep-house" });
  });
});

describe("createArtist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ops.length = 0;
    selectCount = 0;
    userRoleResult = [{ role: "site_admin" }];
    insertReturnValue = [{ id: "new-id", name: "Adam Beyer", slug: "adam-beyer" }];
  });

  it("returns the created artist", async () => {
    const result = await createArtist("Adam Beyer");
    expect(result).toEqual({ id: "new-id", name: "Adam Beyer", slug: "adam-beyer" });
  });
});

describe("bulkAssignGenre", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ops.length = 0;
    selectCount = 0;
    userRoleResult = [{ role: "site_admin" }];
  });

  it("revalidates admin sets path", async () => {
    await bulkAssignGenre(["s-1"], "g-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/sets");
  });
});

describe("refreshSearchIndex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ops.length = 0;
    selectCount = 0;
    userRoleResult = [{ role: "site_admin" }];
  });

  it("calls db.execute for refresh_search_view", async () => {
    await refreshSearchIndex();
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("revalidates admin path", async () => {
    await refreshSearchIndex();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
  });
});
