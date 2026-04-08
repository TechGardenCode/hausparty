import { describe, it, expect } from "vitest";
import { getEmbedUrl } from "./embed-url";
import type { Source } from "@/lib/types/database";

function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    setId: "00000000-0000-0000-0000-000000000002",
    platform: "youtube",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    sourceType: "official",
    mediaType: "video",
    quality: null,
    embedSupported: true,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("getEmbedUrl", () => {
  describe("YouTube", () => {
    it("returns embed URL for youtube.com/watch format with mobile-safe params", () => {
      const source = makeSource({
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      });
      const result = getEmbedUrl(source)!;
      expect(result).toContain("https://www.youtube.com/embed/dQw4w9WgXcQ?");
      expect(result).toContain("playsinline=1");
      expect(result).toContain("modestbranding=1");
      expect(result).toContain("rel=0");
      expect(result).not.toContain("autoplay=1");
    });

    it("returns embed URL for youtu.be short format", () => {
      const source = makeSource({
        url: "https://youtu.be/dQw4w9WgXcQ",
      });
      const result = getEmbedUrl(source)!;
      expect(result).toContain("https://www.youtube.com/embed/dQw4w9WgXcQ?");
      expect(result).toContain("playsinline=1");
    });

    it("returns null for unrecognized YouTube URL format", () => {
      const source = makeSource({
        url: "https://www.youtube.com/channel/UCtest",
      });
      expect(getEmbedUrl(source)).toBeNull();
    });
  });

  describe("SoundCloud", () => {
    it("returns embed URL with encoded source URL", () => {
      const source = makeSource({
        platform: "soundcloud",
        url: "https://soundcloud.com/artist/track-name",
      });
      const result = getEmbedUrl(source);
      expect(result).toContain("w.soundcloud.com/player");
      expect(result).toContain(
        encodeURIComponent("https://soundcloud.com/artist/track-name")
      );
    });

    it("includes color and display parameters", () => {
      const source = makeSource({
        platform: "soundcloud",
        url: "https://soundcloud.com/artist/track",
      });
      const result = getEmbedUrl(source)!;
      expect(result).toContain("color=%23A78BFA");
      expect(result).toContain("hide_related=true");
      expect(result).toContain("show_comments=false");
      expect(result).toContain("visual=true");
    });
  });

  describe("autoplay", () => {
    it("appends autoplay=1 for YouTube when autoplay is true", () => {
      const source = makeSource({
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      });
      const result = getEmbedUrl(source, true)!;
      expect(result).toContain("autoplay=1");
      expect(result).toContain("playsinline=1");
    });

    it("does not append autoplay param for YouTube when autoplay is false", () => {
      const source = makeSource({
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      });
      const result = getEmbedUrl(source, false)!;
      expect(result).not.toContain("autoplay=1");
      expect(result).toContain("playsinline=1");
    });

    it("sets auto_play=true for SoundCloud when autoplay is true", () => {
      const source = makeSource({
        platform: "soundcloud",
        url: "https://soundcloud.com/artist/track",
      });
      const result = getEmbedUrl(source, true)!;
      expect(result).toContain("auto_play=true");
    });

    it("sets auto_play=false for SoundCloud when autoplay is false", () => {
      const source = makeSource({
        platform: "soundcloud",
        url: "https://soundcloud.com/artist/track",
      });
      const result = getEmbedUrl(source, false)!;
      expect(result).toContain("auto_play=false");
    });

    it("defaults autoplay to false when not provided", () => {
      const source = makeSource({
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      });
      const result = getEmbedUrl(source)!;
      expect(result).not.toContain("autoplay=1");
    });
  });

  describe("guard conditions", () => {
    it("returns null when embedSupported is false", () => {
      const source = makeSource({ embedSupported: false });
      expect(getEmbedUrl(source)).toBeNull();
    });

    it("returns null when isActive is false", () => {
      const source = makeSource({ isActive: false });
      expect(getEmbedUrl(source)).toBeNull();
    });

    it("returns null when both embedSupported and isActive are false", () => {
      const source = makeSource({
        embedSupported: false,
        isActive: false,
      });
      expect(getEmbedUrl(source)).toBeNull();
    });

    it("returns null for unsupported platform", () => {
      const source = makeSource({
        platform: "mixcloud" as Source["platform"],
        url: "https://www.mixcloud.com/artist/set",
      });
      expect(getEmbedUrl(source)).toBeNull();
    });
  });
});
