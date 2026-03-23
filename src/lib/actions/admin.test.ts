import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock requireAdmin
vi.mock("@/lib/queries/auth", () => ({
  requireAdmin: vi.fn().mockResolvedValue("admin-user-id"),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock admin client
const mockUpdate = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      update: (...args: unknown[]) => {
        mockUpdate(...args);
        return { eq: mockEq };
      },
    }),
    rpc: mockRpc,
  }),
}));

// Mock processSubmission
const mockProcessSubmission = vi.fn();
vi.mock("@/lib/services/submission-processor", () => ({
  processSubmission: (...args: unknown[]) => mockProcessSubmission(...args),
}));

import { approveSubmission, rejectSubmission, reprocessSubmission } from "./admin";
import { requireAdmin } from "@/lib/queries/auth";
import { revalidatePath } from "next/cache";

describe("approveSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin auth", async () => {
    mockProcessSubmission.mockResolvedValue({ status: "approved" });
    await approveSubmission("sub-1");
    expect(requireAdmin).toHaveBeenCalled();
  });

  it("calls processSubmission with submission id", async () => {
    mockProcessSubmission.mockResolvedValue({ status: "approved" });
    await approveSubmission("sub-1");
    expect(mockProcessSubmission).toHaveBeenCalledWith("sub-1");
  });

  it("refreshes search view when approved", async () => {
    mockProcessSubmission.mockResolvedValue({ status: "approved" });
    await approveSubmission("sub-1");
    expect(mockRpc).toHaveBeenCalledWith("refresh_search_view");
  });

  it("does not refresh search view when not approved", async () => {
    mockProcessSubmission.mockResolvedValue({ status: "rejected", reason: "duplicate" });
    await approveSubmission("sub-2");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("revalidates submissions path", async () => {
    mockProcessSubmission.mockResolvedValue({ status: "approved" });
    await approveSubmission("sub-1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/submissions");
  });
});

describe("rejectSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin auth", async () => {
    await rejectSubmission("sub-1", "Duplicate content");
    expect(requireAdmin).toHaveBeenCalled();
  });

  it("updates submission with rejected status and reason", async () => {
    await rejectSubmission("sub-1", "Duplicate content");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "rejected",
        rejection_reason: "Duplicate content",
      })
    );
    expect(mockEq).toHaveBeenCalledWith("id", "sub-1");
  });

  it("revalidates submissions path", async () => {
    await rejectSubmission("sub-1", "Bad link");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/submissions");
  });
});

describe("reprocessSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires admin auth", async () => {
    mockProcessSubmission.mockResolvedValue({ status: "approved" });
    await reprocessSubmission("sub-1");
    expect(requireAdmin).toHaveBeenCalled();
  });

  it("resets submission to pending before reprocessing", async () => {
    mockProcessSubmission.mockResolvedValue({ status: "approved" });
    await reprocessSubmission("sub-1");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending",
        rejection_reason: null,
        processed_at: null,
        matched_set_id: null,
      })
    );
  });

  it("calls processSubmission after reset", async () => {
    mockProcessSubmission.mockResolvedValue({ status: "approved" });
    await reprocessSubmission("sub-1");
    expect(mockProcessSubmission).toHaveBeenCalledWith("sub-1");
  });

  it("refreshes search view when reprocess approves", async () => {
    mockProcessSubmission.mockResolvedValue({ status: "approved" });
    await reprocessSubmission("sub-1");
    expect(mockRpc).toHaveBeenCalledWith("refresh_search_view");
  });

  it("revalidates submissions path", async () => {
    mockProcessSubmission.mockResolvedValue({ status: "rejected" });
    await reprocessSubmission("sub-1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/submissions");
  });
});
