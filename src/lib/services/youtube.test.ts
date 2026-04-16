import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchYouTubeMetadata } from "./youtube";

describe("fetchYouTubeMetadata", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns metadata on successful fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            title: "Charlotte de Witte - Tomorrowland 2024",
            author_name: "Charlotte de Witte",
            thumbnail_url: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
          }),
      })
    );

    const result = await fetchYouTubeMetadata(
      "https://www.youtube.com/watch?v=abc123"
    );

    expect(result).toEqual({
      title: "Charlotte de Witte - Tomorrowland 2024",
      author: "Charlotte de Witte",
      thumbnailUrl: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
    });
  });

  it("calls YouTube oEmbed endpoint with encoded URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          title: "Test",
          author_name: "Author",
          thumbnail_url: undefined,
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await fetchYouTubeMetadata("https://www.youtube.com/watch?v=abc&t=120");

    expect(mockFetch).toHaveBeenCalledWith(
      `https://www.youtube.com/oembed?url=${encodeURIComponent("https://www.youtube.com/watch?v=abc&t=120")}&format=json`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("returns null when fetch response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 })
    );

    const result = await fetchYouTubeMetadata(
      "https://www.youtube.com/watch?v=invalid"
    );

    expect(result).toBeNull();
  });

  it("handles missing thumbnail_url in response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            title: "Some Set",
            author_name: "DJ Name",
          }),
      })
    );

    const result = await fetchYouTubeMetadata(
      "https://www.youtube.com/watch?v=abc"
    );

    expect(result).toEqual({
      title: "Some Set",
      author: "DJ Name",
      thumbnailUrl: undefined,
    });
  });
});
