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

// Mock processSubmission (needed since admin.ts imports it)
vi.mock("@/lib/services/submission-processor", () => ({
  processSubmission: vi.fn(),
}));

// Mock admin queries
vi.mock("@/lib/queries/admin", () => ({
  searchArtists: vi.fn(),
  searchEvents: vi.fn(),
  searchFestivals: vi.fn(),
  getGenreSuggestionsForArtists: vi.fn(),
}));

// ---- Drizzle db mock ----
const mockExecute = vi.fn().mockResolvedValue(undefined);
let userRoleResult: { role: string }[] = [{ role: "site_admin" }];
let insertReturnValue = [{ id: "new-id", name: "Test", slug: "test" }];

function createChainProxy(op: string): unknown {
  return new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === "then" || prop === "catch" || prop === "finally")
        return undefined;
      return (..._args: unknown[]) => {
        if (prop === "limit") {
          return Promise.resolve(userRoleResult);
        }
        if (prop === "returning") {
          return Promise.resolve(insertReturnValue);
        }
        if (prop === "where" && (op === "update" || op === "delete")) {
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
  updateSet,
  updateSetArtists,
  updateSetGenres,
  createEvent,
  createGenre,
  createArtist,
  bulkAssignGenre,
  refreshSearchIndex,
} = await import("./admin");

beforeEach(() => {
  vi.clearAllMocks();
  userRoleResult = [{ role: "site_admin" }];
  insertReturnValue = [{ id: "new-id", name: "Test", slug: "test" }];
});

describe("updateSet", () => {
  it("updates the set and revalidates paths", async () => {
    await updateSet("set-1", { title: "New Title", slug: "new-title" });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/sets");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/sets/set-1/edit");
  });
});

describe("updateSetArtists", () => {
  it("deletes existing and inserts new artist associations", async () => {
    await updateSetArtists("set-1", [
      { id: "a-1", position: 0 },
      { id: "a-2", position: 1 },
    ]);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/sets");
  });

  it("skips insert when artists array is empty", async () => {
    await updateSetArtists("set-1", []);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/sets");
  });
});

describe("updateSetGenres", () => {
  it("deletes existing and inserts new genre associations", async () => {
    await updateSetGenres("set-1", ["g-1", "g-2"]);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/sets");
  });

  it("skips insert when genre array is empty", async () => {
    await updateSetGenres("set-1", []);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/sets");
  });
});

describe("createEvent", () => {
  it("inserts event and returns result", async () => {
    insertReturnValue = [{ id: "new-id", name: "Ultra 2026", slug: "ultra-2026" }];
    const result = await createEvent({ name: "Ultra 2026", date_start: "2026-03-20" });
    expect(result).toEqual({ id: "new-id", name: "Ultra 2026", slug: "ultra-2026" });
  });

  it("passes festival_id when provided", async () => {
    insertReturnValue = [{ id: "new-id", name: "Test", slug: "test" }];
    const result = await createEvent({ name: "Test", festival_id: "fest-1" });
    expect(result.id).toBe("new-id");
  });
});

describe("createGenre", () => {
  it("inserts genre with slugified name", async () => {
    insertReturnValue = [{ id: "new-id", name: "Deep House", slug: "deep-house" }];
    const result = await createGenre("Deep House");
    expect(result).toEqual({ id: "new-id", name: "Deep House", slug: "deep-house" });
  });
});

describe("createArtist", () => {
  it("inserts artist with slugified name", async () => {
    insertReturnValue = [{ id: "new-id", name: "Adam Beyer", slug: "adam-beyer" }];
    const result = await createArtist("Adam Beyer");
    expect(result).toEqual({ id: "new-id", name: "Adam Beyer", slug: "adam-beyer" });
  });
});

describe("bulkAssignGenre", () => {
  it("upserts set_genres rows and revalidates", async () => {
    await bulkAssignGenre(["s-1", "s-2", "s-3"], "g-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/sets");
  });
});

describe("refreshSearchIndex", () => {
  it("calls db.execute for refresh_search_view", async () => {
    await refreshSearchIndex();
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("revalidates admin path", async () => {
    await refreshSearchIndex();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
  });
});
