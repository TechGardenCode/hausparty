import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSoundCloudMetadata } from "./soundcloud";

describe("fetchSoundCloudMetadata", () => {
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
            title: "Amelie Lens at Awakenings 2024",
            author_name: "Amelie Lens",
            thumbnail_url: "https://i1.sndcdn.com/artworks-abc123.jpg",
          }),
      })
    );

    const result = await fetchSoundCloudMetadata(
      "https://soundcloud.com/amelie-lens/awakenings-2024"
    );

    expect(result).toEqual({
      title: "Amelie Lens at Awakenings 2024",
      author: "Amelie Lens",
      thumbnailUrl: "https://i1.sndcdn.com/artworks-abc123.jpg",
    });
  });

  it("calls SoundCloud oEmbed endpoint with encoded URL", async () => {
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

    await fetchSoundCloudMetadata(
      "https://soundcloud.com/artist/set-name"
    );

    expect(mockFetch).toHaveBeenCalledWith(
      `https://soundcloud.com/oembed?url=${encodeURIComponent("https://soundcloud.com/artist/set-name")}&format=json`
    );
  });

  it("returns null when fetch response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 })
    );

    const result = await fetchSoundCloudMetadata(
      "https://soundcloud.com/invalid/track"
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
            title: "Some Mix",
            author_name: "DJ Name",
          }),
      })
    );

    const result = await fetchSoundCloudMetadata(
      "https://soundcloud.com/dj/mix"
    );

    expect(result).toEqual({
      title: "Some Mix",
      author: "DJ Name",
      thumbnailUrl: undefined,
    });
  });
});
