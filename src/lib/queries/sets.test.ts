import { describe, it, expect } from "vitest";
import { normalizeSet } from "./sets";

const makeSetRow = (overrides = {}) => ({
  id: "set-1",
  title: "Test Set",
  slug: "test-set",
  performedAt: "2025-06-15T20:00:00Z",
  durationSeconds: 3600,
  stage: "Main Stage",
  setArtists: [
    { position: 2, artist: { id: "a2", name: "Artist B", slug: "artist-b" } },
    { position: 1, artist: { id: "a1", name: "Artist A", slug: "artist-a" } },
  ],
  setGenres: [
    { genre: { id: "g1", name: "Techno", slug: "techno" } },
    { genre: { id: "g2", name: "House", slug: "house" } },
  ],
  event: {
    id: "e1",
    name: "Tomorrowland 2025",
    slug: "tomorrowland-2025",
    festival: { id: "f1", name: "Tomorrowland", slug: "tomorrowland" },
  },
  sources: [
    {
      id: "s1",
      platform: "youtube" as const,
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      sourceType: "official" as const,
      mediaType: "video" as const,
      quality: "1080p",
      isActive: true,
    },
  ],
  ...overrides,
});

describe("normalizeSet", () => {
  it("sorts artists by position", () => {
    const result = normalizeSet(makeSetRow());
    expect(result.artists[0].name).toBe("Artist A");
    expect(result.artists[1].name).toBe("Artist B");
  });

  it("flattens genres from join table", () => {
    const result = normalizeSet(makeSetRow());
    expect(result.genres).toHaveLength(2);
    expect(result.genres[0].name).toBe("Techno");
  });

  it("extracts event from nested event field", () => {
    const result = normalizeSet(makeSetRow());
    expect(result.event?.name).toBe("Tomorrowland 2025");
  });

  it("extracts festival from nested event.festival", () => {
    const result = normalizeSet(makeSetRow());
    expect(result.festival?.name).toBe("Tomorrowland");
  });

  it("returns null event and festival when event is null", () => {
    const result = normalizeSet(makeSetRow({ event: null }));
    expect(result.event).toBeNull();
    expect(result.festival).toBeNull();
  });

  it("passes sources through unchanged", () => {
    const result = normalizeSet(makeSetRow());
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].platform).toBe("youtube");
  });

  it("handles empty setArtists and setGenres", () => {
    const result = normalizeSet(makeSetRow({ setArtists: [], setGenres: [] }));
    expect(result.artists).toEqual([]);
    expect(result.genres).toEqual([]);
  });

  it("filters out null artists from join", () => {
    const result = normalizeSet(
      makeSetRow({
        setArtists: [{ position: 1, artist: null }],
      })
    );
    expect(result.artists).toEqual([]);
  });

  it("sorts tracklist by position when present", () => {
    const result = normalizeSet(
      makeSetRow({
        tracklistEntries: [
          { id: "t2", position: 2, title: "Track B", timestampSeconds: 120 },
          { id: "t1", position: 1, title: "Track A", timestampSeconds: 0 },
        ],
      })
    );
    expect(result.tracklist).toHaveLength(2);
    expect(result.tracklist![0].title).toBe("Track A");
  });

  it("returns undefined tracklist when not present", () => {
    const result = normalizeSet(makeSetRow());
    expect(result.tracklist).toBeUndefined();
  });

  it("derives thumbnailUrl from YouTube source URL", () => {
    const result = normalizeSet(makeSetRow());
    expect(result.thumbnailUrl).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg"
    );
  });

  it("returns null thumbnailUrl when no YouTube source with URL", () => {
    const result = normalizeSet(
      makeSetRow({
        sources: [
          {
            id: "s1",
            platform: "soundcloud" as const,
            url: "https://soundcloud.com/example",
            source_type: "official" as const,
          },
        ],
      })
    );
    expect(result.thumbnailUrl).toBeNull();
  });

  it("returns null thumbnailUrl when sources are empty", () => {
    const result = normalizeSet(makeSetRow({ sources: [] }));
    expect(result.thumbnailUrl).toBeNull();
  });
});
