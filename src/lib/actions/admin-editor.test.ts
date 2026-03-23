import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock requireAdmin
vi.mock("@/lib/queries/auth", () => ({
  requireAdmin: vi.fn().mockResolvedValue("admin-user-id"),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock slugify
vi.mock("@/lib/utils", () => ({
  slugify: (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
}));

// Mock processSubmission (needed since admin.ts imports it)
vi.mock("@/lib/services/submission-processor", () => ({
  processSubmission: vi.fn(),
}));

// Build a chainable mock for Supabase operations
const mockUpdateEq = vi.fn().mockResolvedValue({ data: null, error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
const mockDeleteEq = vi.fn().mockResolvedValue({ data: null, error: null });
const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });
const mockInsertSelect = vi.fn();
const mockInsert = vi.fn().mockImplementation(() => ({
  select: (...args: unknown[]) => {
    mockInsertSelect(...args);
    return { single: vi.fn().mockResolvedValue({ data: { id: "new-id", name: "Test", slug: "test" }, error: null }) };
  },
}));
const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      // Track which table is being accessed
      mockFrom(table);
      return {
        update: mockUpdate,
        delete: mockDelete,
        insert: mockInsert,
        upsert: mockUpsert,
      };
    },
    rpc: mockRpc,
  }),
}));

const mockFrom = vi.fn();

import {
  updateSet,
  updateSetArtists,
  updateSetGenres,
  createEvent,
  createGenre,
  createArtist,
  bulkAssignGenre,
  refreshSearchIndex,
} from "./admin";
import { requireAdmin } from "@/lib/queries/auth";
import { revalidatePath } from "next/cache";

beforeEach(() => {
  vi.clearAllMocks();
  // Reset insert to return data by default
  mockInsert.mockImplementation(() => ({
    select: (...args: unknown[]) => {
      mockInsertSelect(...args);
      return { single: vi.fn().mockResolvedValue({ data: { id: "new-id", name: "Test", slug: "test" }, error: null }) };
    },
  }));
});

describe("updateSet", () => {
  it("requires admin auth", async () => {
    await updateSet("set-1", { title: "New Title" });
    expect(requireAdmin).toHaveBeenCalled();
  });

  it("updates the sets table", async () => {
    await updateSet("set-1", { title: "New Title", slug: "new-title" });
    expect(mockFrom).toHaveBeenCalledWith("sets");
    expect(mockUpdate).toHaveBeenCalledWith({ title: "New Title", slug: "new-title" });
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "set-1");
  });

  it("revalidates admin sets paths", async () => {
    await updateSet("set-1", { title: "X" });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/sets");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/sets/set-1/edit");
  });

  it("throws on error", async () => {
    mockUpdateEq.mockResolvedValueOnce({ data: null, error: { message: "DB error" } });
    await expect(updateSet("set-1", { title: "X" })).rejects.toThrow("DB error");
  });
});

describe("updateSetArtists", () => {
  it("requires admin auth", async () => {
    await updateSetArtists("set-1", []);
    expect(requireAdmin).toHaveBeenCalled();
  });

  it("deletes existing set_artists then inserts new ones", async () => {
    await updateSetArtists("set-1", [
      { id: "a-1", position: 0 },
      { id: "a-2", position: 1 },
    ]);
    // First call: delete
    expect(mockFrom).toHaveBeenCalledWith("set_artists");
    expect(mockDelete).toHaveBeenCalled();
    expect(mockDeleteEq).toHaveBeenCalledWith("set_id", "set-1");
    // Second call: insert
    expect(mockInsert).toHaveBeenCalledWith([
      { set_id: "set-1", artist_id: "a-1", position: 0 },
      { set_id: "set-1", artist_id: "a-2", position: 1 },
    ]);
  });

  it("skips insert when artists array is empty", async () => {
    await updateSetArtists("set-1", []);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe("updateSetGenres", () => {
  it("requires admin auth", async () => {
    await updateSetGenres("set-1", []);
    expect(requireAdmin).toHaveBeenCalled();
  });

  it("deletes existing set_genres then inserts new ones", async () => {
    await updateSetGenres("set-1", ["g-1", "g-2"]);
    expect(mockFrom).toHaveBeenCalledWith("set_genres");
    expect(mockDelete).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalledWith([
      { set_id: "set-1", genre_id: "g-1" },
      { set_id: "set-1", genre_id: "g-2" },
    ]);
  });

  it("skips insert when genre array is empty", async () => {
    await updateSetGenres("set-1", []);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe("createEvent", () => {
  it("requires admin auth", async () => {
    await createEvent({ name: "Ultra 2026" });
    expect(requireAdmin).toHaveBeenCalled();
  });

  it("inserts event with slugified name", async () => {
    await createEvent({ name: "Ultra 2026", date_start: "2026-03-20" });
    expect(mockFrom).toHaveBeenCalledWith("events");
    expect(mockInsert).toHaveBeenCalledWith({
      name: "Ultra 2026",
      slug: "ultra-2026",
      festival_id: null,
      date_start: "2026-03-20",
    });
  });

  it("passes festival_id when provided", async () => {
    await createEvent({ name: "Test", festival_id: "fest-1" });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ festival_id: "fest-1" })
    );
  });
});

describe("createGenre", () => {
  it("requires admin auth", async () => {
    await createGenre("Techno");
    expect(requireAdmin).toHaveBeenCalled();
  });

  it("inserts genre with slugified name", async () => {
    await createGenre("Deep House");
    expect(mockFrom).toHaveBeenCalledWith("genres");
    expect(mockInsert).toHaveBeenCalledWith({ name: "Deep House", slug: "deep-house" });
  });
});

describe("createArtist", () => {
  it("requires admin auth", async () => {
    await createArtist("DJ Test");
    expect(requireAdmin).toHaveBeenCalled();
  });

  it("inserts artist with slugified name", async () => {
    await createArtist("Adam Beyer");
    expect(mockFrom).toHaveBeenCalledWith("artists");
    expect(mockInsert).toHaveBeenCalledWith({ name: "Adam Beyer", slug: "adam-beyer" });
  });
});

describe("bulkAssignGenre", () => {
  it("requires admin auth", async () => {
    await bulkAssignGenre(["s-1"], "g-1");
    expect(requireAdmin).toHaveBeenCalled();
  });

  it("upserts set_genres rows with ignore duplicates", async () => {
    await bulkAssignGenre(["s-1", "s-2", "s-3"], "g-1");
    expect(mockFrom).toHaveBeenCalledWith("set_genres");
    expect(mockUpsert).toHaveBeenCalledWith(
      [
        { set_id: "s-1", genre_id: "g-1" },
        { set_id: "s-2", genre_id: "g-1" },
        { set_id: "s-3", genre_id: "g-1" },
      ],
      { onConflict: "set_id,genre_id", ignoreDuplicates: true }
    );
  });

  it("revalidates admin sets path", async () => {
    await bulkAssignGenre(["s-1"], "g-1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/sets");
  });
});

describe("refreshSearchIndex", () => {
  it("requires admin auth", async () => {
    await refreshSearchIndex();
    expect(requireAdmin).toHaveBeenCalled();
  });

  it("calls refresh_search_view RPC", async () => {
    await refreshSearchIndex();
    expect(mockRpc).toHaveBeenCalledWith("refresh_search_view");
  });

  it("revalidates admin path", async () => {
    await refreshSearchIndex();
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("throws on RPC error", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "RPC failed" } });
    await expect(refreshSearchIndex()).rejects.toThrow("RPC failed");
  });
});
