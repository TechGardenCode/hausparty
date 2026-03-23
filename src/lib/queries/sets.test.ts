import { describe, it, expect } from "vitest";
import { normalizeSet } from "./sets";

const makeSetRow = (overrides = {}) => ({
  id: "set-1",
  title: "Test Set",
  slug: "test-set",
  performed_at: "2025-06-15T20:00:00Z",
  duration_seconds: 3600,
  stage: "Main Stage",
  set_artists: [
    { position: 2, artists: { id: "a2", name: "Artist B", slug: "artist-b" } },
    { position: 1, artists: { id: "a1", name: "Artist A", slug: "artist-a" } },
  ],
  set_genres: [
    { genres: { id: "g1", name: "Techno", slug: "techno" } },
    { genres: { id: "g2", name: "House", slug: "house" } },
  ],
  events: {
    id: "e1",
    name: "Tomorrowland 2025",
    slug: "tomorrowland-2025",
    festivals: { id: "f1", name: "Tomorrowland", slug: "tomorrowland" },
  },
  sources: [
    {
      id: "s1",
      platform: "youtube" as const,
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      source_type: "official" as const,
      media_type: "video" as const,
      quality: "1080p",
      is_active: true,
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

  it("extracts event from nested events field", () => {
    const result = normalizeSet(makeSetRow());
    expect(result.event?.name).toBe("Tomorrowland 2025");
  });

  it("extracts festival from nested events.festivals", () => {
    const result = normalizeSet(makeSetRow());
    expect(result.festival?.name).toBe("Tomorrowland");
  });

  it("returns null event and festival when events is null", () => {
    const result = normalizeSet(makeSetRow({ events: null }));
    expect(result.event).toBeNull();
    expect(result.festival).toBeNull();
  });

  it("passes sources through unchanged", () => {
    const result = normalizeSet(makeSetRow());
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].platform).toBe("youtube");
  });

  it("handles empty set_artists and set_genres", () => {
    const result = normalizeSet(makeSetRow({ set_artists: [], set_genres: [] }));
    expect(result.artists).toEqual([]);
    expect(result.genres).toEqual([]);
  });

  it("filters out null artists from join", () => {
    const result = normalizeSet(
      makeSetRow({
        set_artists: [{ position: 1, artists: null }],
      })
    );
    expect(result.artists).toEqual([]);
  });

  it("sorts tracklist by position when present", () => {
    const result = normalizeSet(
      makeSetRow({
        tracklist_entries: [
          { id: "t2", position: 2, title: "Track B", timestamp_seconds: 120 },
          { id: "t1", position: 1, title: "Track A", timestamp_seconds: 0 },
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
