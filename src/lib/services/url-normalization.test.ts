import { describe, it, expect } from "vitest";
import { normalizeSourceUrl } from "./url-normalization";

describe("normalizeSourceUrl", () => {
  describe("YouTube", () => {
    it("normalizes youtube.com/watch URLs", () => {
      expect(normalizeSourceUrl("https://www.youtube.com/watch?v=abc12345678")).toBe(
        "https://www.youtube.com/watch?v=abc12345678"
      );
    });

    it("normalizes youtu.be short URLs", () => {
      expect(normalizeSourceUrl("https://youtu.be/abc12345678")).toBe(
        "https://www.youtube.com/watch?v=abc12345678"
      );
    });

    it("normalizes youtube.com/embed URLs", () => {
      expect(normalizeSourceUrl("https://www.youtube.com/embed/abc12345678")).toBe(
        "https://www.youtube.com/watch?v=abc12345678"
      );
    });

    it("strips extra query params like t=30", () => {
      expect(
        normalizeSourceUrl("https://www.youtube.com/watch?v=abc12345678&t=30")
      ).toBe("https://www.youtube.com/watch?v=abc12345678");
    });

    it("normalizes mobile YouTube URLs", () => {
      expect(
        normalizeSourceUrl("https://m.youtube.com/watch?v=abc12345678")
      ).toBe("https://www.youtube.com/watch?v=abc12345678");
    });

    it("normalizes YouTube Shorts URLs", () => {
      expect(
        normalizeSourceUrl("https://www.youtube.com/shorts/abc12345678")
      ).toBe("https://www.youtube.com/watch?v=abc12345678");
    });

    it("normalizes http to https", () => {
      expect(
        normalizeSourceUrl("http://www.youtube.com/watch?v=abc12345678")
      ).toBe("https://www.youtube.com/watch?v=abc12345678");
    });

    it("handles youtube.com/v/ format", () => {
      expect(
        normalizeSourceUrl("https://www.youtube.com/v/abc12345678")
      ).toBe("https://www.youtube.com/watch?v=abc12345678");
    });

    it("same video ID from different formats produce identical output", () => {
      const formats = [
        "https://youtu.be/abc12345678",
        "https://www.youtube.com/watch?v=abc12345678&t=30",
        "https://youtube.com/embed/abc12345678",
        "https://m.youtube.com/watch?v=abc12345678",
      ];
      const normalized = formats.map(normalizeSourceUrl);
      expect(new Set(normalized).size).toBe(1);
    });
  });

  describe("SoundCloud", () => {
    it("normalizes basic SoundCloud URLs", () => {
      expect(
        normalizeSourceUrl("https://soundcloud.com/artist-name/track-name")
      ).toBe("https://soundcloud.com/artist-name/track-name");
    });

    it("strips query params from SoundCloud URLs", () => {
      expect(
        normalizeSourceUrl(
          "https://soundcloud.com/artist-name/track-name?in=playlists/discover&utm_source=clipboard"
        )
      ).toBe("https://soundcloud.com/artist-name/track-name");
    });

    it("strips si param from SoundCloud URLs", () => {
      expect(
        normalizeSourceUrl(
          "https://soundcloud.com/artist-name/track-name?si=abc123"
        )
      ).toBe("https://soundcloud.com/artist-name/track-name");
    });

    it("removes trailing slash", () => {
      expect(
        normalizeSourceUrl("https://soundcloud.com/artist-name/track-name/")
      ).toBe("https://soundcloud.com/artist-name/track-name");
    });

    it("normalizes http to https", () => {
      expect(
        normalizeSourceUrl("http://soundcloud.com/artist-name/track-name")
      ).toBe("https://soundcloud.com/artist-name/track-name");
    });
  });

  describe("General URLs", () => {
    it("strips tracking params from unknown URLs", () => {
      expect(
        normalizeSourceUrl(
          "https://example.com/page?id=1&utm_source=twitter&utm_medium=social"
        )
      ).toBe("https://example.com/page?id=1");
    });

    it("strips fbclid param", () => {
      expect(
        normalizeSourceUrl("https://example.com/page?fbclid=abc123")
      ).toBe("https://example.com/page");
    });

    it("normalizes http to https", () => {
      expect(normalizeSourceUrl("http://example.com/page")).toBe(
        "https://example.com/page"
      );
    });

    it("passes through clean URLs unchanged", () => {
      expect(normalizeSourceUrl("https://example.com/page?id=1")).toBe(
        "https://example.com/page?id=1"
      );
    });

    it("returns invalid URLs as-is", () => {
      expect(normalizeSourceUrl("not-a-url")).toBe("not-a-url");
    });
  });
});
