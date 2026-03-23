import { describe, it, expect } from "vitest";
import { getYouTubeThumbnail } from "../utils";

describe("getYouTubeThumbnail", () => {
  it("extracts ID from youtube.com/watch?v= URL", () => {
    expect(getYouTubeThumbnail("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg"
    );
  });

  it("extracts ID from youtube.com/watch with extra params", () => {
    expect(
      getYouTubeThumbnail("https://www.youtube.com/watch?t=120&v=dQw4w9WgXcQ&list=abc")
    ).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg");
  });

  it("extracts ID from youtu.be short URL", () => {
    expect(getYouTubeThumbnail("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg"
    );
  });

  it("extracts ID from youtube.com/embed URL", () => {
    expect(getYouTubeThumbnail("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg"
    );
  });

  it("returns null for SoundCloud URL", () => {
    expect(getYouTubeThumbnail("https://soundcloud.com/artist/track")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(getYouTubeThumbnail(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(getYouTubeThumbnail(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getYouTubeThumbnail("")).toBeNull();
  });

  it("handles URL without protocol", () => {
    expect(getYouTubeThumbnail("youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg"
    );
  });

  it("handles IDs with hyphens and underscores", () => {
    expect(getYouTubeThumbnail("https://www.youtube.com/watch?v=abc-_123DEf")).toBe(
      "https://img.youtube.com/vi/abc-_123DEf/mqdefault.jpg"
    );
  });
});
